import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id
  const pool = getPool()

  try {
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

    // GET /api/workouts?week=X — list workouts
    if (req.method === 'GET') {
      const week = parseInt(req.query.week) || 0
      const { rows } = await pool.query(
        'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY start_time ASC NULLS LAST, id',
        [userId, week]
      )
      return res.json(rows)
    }

    if (req.method === 'POST') {
      // POST /api/workouts?action=import — bulk import week
      if (action === 'import') {
        const { week_offset, week } = req.body
        const off = week_offset ?? 0
        if (!week) return res.status(400).json({ error: 'Brak klucza "week"' })

        await pool.query('DELETE FROM workouts WHERE user_id = $1 AND week_offset = $2', [userId, off])

        const inserts = []
        for (const [day, list] of Object.entries(week)) {
          for (const w of list || []) {
            inserts.push(pool.query(
              `INSERT INTO workouts (user_id, discipline, day, week_offset, title, notes, params, exercises, rest, done, start_time, recurrence)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
              [userId, w.discipline || '', day, off, w.title || '', w.notes || '',
               JSON.stringify(w.params || []), JSON.stringify(w.exercises || []), w.rest || false, false,
               w.start_time || '', JSON.stringify(w.recurrence || null)]
            ))
          }
        }
        await Promise.all(inserts)

        const { rows } = await pool.query(
          'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY id',
          [userId, off]
        )
        return res.json(rows)
      }

      // POST /api/workouts — create single workout
      const { discipline, day, week_offset, title, notes, params, exercises, rest, done, start_time, recurrence } = req.body
      const { rows } = await pool.query(
        `INSERT INTO workouts (user_id, discipline, day, week_offset, title, notes, params, exercises, rest, done, start_time, recurrence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [userId, discipline, day, week_offset || 0, title || '', notes || '',
         JSON.stringify(params || []), JSON.stringify(exercises || []), rest || false, done || false,
         start_time || '', JSON.stringify(recurrence || null)]
      )
      return res.status(201).json(rows[0])
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Workouts error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
