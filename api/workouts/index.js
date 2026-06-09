import getPool from '../_db.js'
import { verifyUser, cors } from '../_auth.js'

// Ensure the absolute-week anchor column exists and is backfilled. Workouts used
// to be stored with a relative `week_offset` which drifts as calendar weeks pass;
// `week_start` (the Monday of the week) pins them to real dates instead.
let schemaReady
function ensureSchema(pool) {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS week_start DATE;
      UPDATE workouts
        SET week_start = (date_trunc('week', CURRENT_DATE))::date + (COALESCE(week_offset, 0) * 7)
        WHERE week_start IS NULL;
      CREATE INDEX IF NOT EXISTS idx_workouts_user_weekstart ON workouts(user_id, week_start);
    `).catch((e) => { schemaReady = undefined; throw e })
  }
  return schemaReady
}

async function currentMonday(pool) {
  const { rows } = await pool.query("SELECT (date_trunc('week', CURRENT_DATE))::date AS d")
  return rows[0].d
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const pool = getPool()
  const payload = await verifyUser(req, pool)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id

  try {
    await ensureSchema(pool)
    const { id, action } = req.query

    // PUT /api/workouts?id=X — update workout
    if (req.method === 'PUT' && id) {
      const { discipline, day, title, notes, params, exercises, rest, done, start_time, recurrence } = req.body
      const { rows } = await pool.query(
        `UPDATE workouts SET discipline=$1, day=$2, title=$3, notes=$4, params=$5, exercises=$6, rest=$7, done=$8, start_time=$9, recurrence=$10
         WHERE id=$11 AND user_id=$12 RETURNING *`,
        [discipline, day, title || '', notes || '',
         JSON.stringify(params || []), JSON.stringify(exercises || []), rest || false, done || false,
         start_time || '', JSON.stringify(recurrence || null),
         id, userId]
      )
      if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json(rows[0])
    }

    // DELETE /api/workouts?id=X — delete workout
    if (req.method === 'DELETE' && id) {
      const { rowCount } = await pool.query(
        'DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]
      )
      if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json({ ok: true })
    }

    // GET /api/workouts?week_start=YYYY-MM-DD — list workouts for a week
    if (req.method === 'GET') {
      const weekStart = req.query.week_start || (await currentMonday(pool))
      const { rows } = await pool.query(
        'SELECT * FROM workouts WHERE user_id = $1 AND week_start = $2 ORDER BY start_time ASC NULLS LAST, id',
        [userId, weekStart]
      )
      return res.json(rows)
    }

    if (req.method === 'POST') {
      // POST /api/workouts?action=import — bulk import week
      if (action === 'import') {
        const { week_start, week } = req.body
        if (!week) return res.status(400).json({ error: 'Brak klucza "week"' })
        const ws = week_start || (await currentMonday(pool))

        // Wymiana całego tygodnia w jednej transakcji — błąd przy dowolnym
        // insercie nie może skasować dotychczasowego planu.
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query('DELETE FROM workouts WHERE user_id = $1 AND week_start = $2', [userId, ws])
          for (const [day, list] of Object.entries(week)) {
            for (const w of list || []) {
              await client.query(
                `INSERT INTO workouts (user_id, discipline, day, week_start, title, notes, params, exercises, rest, done, start_time, recurrence)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [userId, w.discipline || '', day, ws, w.title || '', w.notes || '',
                 JSON.stringify(w.params || []), JSON.stringify(w.exercises || []), w.rest || false, false,
                 w.start_time || '', JSON.stringify(w.recurrence || null)]
              )
            }
          }
          await client.query('COMMIT')
        } catch (e) {
          await client.query('ROLLBACK').catch(() => {})
          throw e
        } finally {
          client.release()
        }

        const { rows } = await pool.query(
          'SELECT * FROM workouts WHERE user_id = $1 AND week_start = $2 ORDER BY id',
          [userId, ws]
        )
        return res.json(rows)
      }

      // POST /api/workouts — create single workout
      const { discipline, day, week_start, title, notes, params, exercises, rest, done, start_time, recurrence } = req.body
      const ws = week_start || (await currentMonday(pool))
      const { rows } = await pool.query(
        `INSERT INTO workouts (user_id, discipline, day, week_start, title, notes, params, exercises, rest, done, start_time, recurrence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [userId, discipline, day, ws, title || '', notes || '',
         JSON.stringify(params || []), JSON.stringify(exercises || []), rest || false, done || false,
         start_time || '', JSON.stringify(recurrence || null)]
      )
      return res.status(201).json(rows[0])
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Workouts error:', e)
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
