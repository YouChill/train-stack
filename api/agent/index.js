import crypto from 'crypto'
import getPool from '../_db.js'
import { rateLimit, clientIp } from '../_ratelimit.js'

// Endpoint dla agenta (integracje maszynowe): zamiast JWT zalogowanego
// użytkownika uwierzytelnia się stałym kluczem AGENT_API_KEY z env i wskazuje
// docelowego użytkownika parametrem ?user= (e-mail lub numeryczne id).
// Pozwala odczytać plan tygodnia, edytować pojedyncze pozycje oraz dodawać
// treningi — pojedynczo lub całym tygodniem.

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Pola workoutu, które wolno ustawiać z zewnątrz; wartości JSON muszą być
// serializowane przed zapisem do kolumn JSONB.
const JSON_FIELDS = new Set(['params', 'exercises', 'recurrence'])
const WRITABLE_FIELDS = ['discipline', 'day', 'title', 'notes', 'params', 'exercises', 'rest', 'done', 'start_time', 'recurrence', 'series_id']

function safeEqual(a, b) {
  // Porównanie hashy zamiast surowych stringów — timingSafeEqual wymaga
  // buforów tej samej długości, a długość klucza nie może wyciekać czasem odpowiedzi.
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

function extractKey(req) {
  const h = req.headers.authorization
  if (h?.startsWith('Bearer ')) return h.slice(7)
  return req.headers['x-api-key'] || null
}

// Ta sama gwarancja schematu co w api/workouts — agent może uderzyć w świeżą
// bazę zanim ktokolwiek otworzy aplikację.
let schemaReady
function ensureSchema(pool) {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS week_start DATE;
      UPDATE workouts
        SET week_start = (date_trunc('week', CURRENT_DATE))::date + (COALESCE(week_offset, 0) * 7)
        WHERE week_start IS NULL;
      CREATE INDEX IF NOT EXISTS idx_workouts_user_weekstart ON workouts(user_id, week_start);
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS series_id TEXT;
    `).catch((e) => { schemaReady = undefined; throw e })
  }
  return schemaReady
}

// Dowolna data wejściowa jest przycinana do poniedziałku swojego tygodnia —
// agent nie musi wiedzieć, że plan jest kluczowany poniedziałkiem.
async function toMonday(pool, dateStr) {
  const { rows } = await pool.query(
    "SELECT (date_trunc('week', COALESCE($1::date, CURRENT_DATE)))::date AS d",
    [dateStr || null]
  )
  return rows[0].d
}

async function findUser(pool, ident) {
  const byId = /^\d+$/.test(ident)
  const { rows } = await pool.query(
    byId
      ? 'SELECT id, email, name FROM users WHERE id = $1'
      : 'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1)',
    [ident]
  )
  return rows[0] || null
}

function normalizeWorkout(w, day) {
  return [
    w.discipline || '', day, w.title || '', w.notes || '',
    JSON.stringify(w.params || []), JSON.stringify(w.exercises || []),
    w.rest || false, w.done || false, w.start_time || '',
    JSON.stringify(w.recurrence || null), w.series_id || null,
  ]
}

async function insertWorkout(client, userId, weekStart, day, w) {
  const { rows } = await client.query(
    `INSERT INTO workouts (user_id, week_start, discipline, day, title, notes, params, exercises, rest, done, start_time, recurrence, series_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [userId, weekStart, ...normalizeWorkout(w, day)]
  )
  return rows[0]
}

function groupByDay(rows) {
  const days = Object.fromEntries(VALID_DAYS.map((d) => [d, []]))
  for (const r of rows) (days[r.day] || (days[r.day] = [])).push(r)
  return days
}

export default async function handler(req, res) {
  const pool = getPool()
  const ip = clientIp(req)

  const configured = process.env.AGENT_API_KEY
  if (!configured) {
    return res.status(503).json({ error: 'AGENT_API_KEY nie jest skonfigurowany na serwerze' })
  }

  const key = extractKey(req)
  if (!key || !safeEqual(key, configured)) {
    // Wolny limit na nieudane próby — utrudnia zgadywanie klucza.
    await rateLimit(pool, `agent-auth:${ip}`, 10, 900)
    return res.status(401).json({ error: 'Nieprawidłowy klucz API' })
  }
  if (!(await rateLimit(pool, `agent:${ip}`, 120, 60))) {
    return res.status(429).json({ error: 'Za dużo żądań — spróbuj za chwilę' })
  }

  const ident = req.query.user || req.body?.user
  if (!ident) {
    return res.status(400).json({ error: 'Wymagany parametr "user" (e-mail lub id użytkownika)' })
  }

  try {
    await ensureSchema(pool)
    const user = await findUser(pool, String(ident))
    if (!user) return res.status(404).json({ error: `Nie znaleziono użytkownika "${ident}"` })
    const userId = user.id
    const { id } = req.query

    // GET /api/agent?user=X[&week_start=YYYY-MM-DD] — plan tygodnia + dyscypliny
    if (req.method === 'GET') {
      const weekStart = await toMonday(pool, req.query.week_start)
      const [workouts, disciplines] = await Promise.all([
        pool.query(
          'SELECT * FROM workouts WHERE user_id = $1 AND week_start = $2 ORDER BY start_time ASC NULLS LAST, id',
          [userId, weekStart]
        ),
        pool.query('SELECT ext_id, name, icon, has_ex FROM disciplines WHERE user_id = $1 ORDER BY id', [userId]),
      ])
      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        week_start: weekStart,
        days: groupByDay(workouts.rows),
        disciplines: disciplines.rows,
      })
    }

    // PUT /api/agent?user=X&id=N — częściowa edycja pozycji: aktualizowane są
    // tylko pola obecne w body, reszta zostaje bez zmian.
    if (req.method === 'PUT' && id) {
      const body = req.body || {}
      if (body.day !== undefined && !VALID_DAYS.includes(body.day)) {
        return res.status(400).json({ error: `Nieprawidłowy dzień "${body.day}" — dozwolone: ${VALID_DAYS.join(', ')}` })
      }
      const sets = []
      const values = []
      for (const f of WRITABLE_FIELDS) {
        if (body[f] === undefined) continue
        values.push(JSON_FIELDS.has(f) ? JSON.stringify(body[f]) : body[f])
        sets.push(`${f} = $${values.length}`)
      }
      if (body.week_start !== undefined) {
        values.push(await toMonday(pool, body.week_start))
        sets.push(`week_start = $${values.length}`)
      }
      if (!sets.length) return res.status(400).json({ error: 'Brak pól do aktualizacji' })
      values.push(id, userId)
      const { rows } = await pool.query(
        `UPDATE workouts SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
        values
      )
      if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono treningu' })
      return res.json(rows[0])
    }

    // DELETE /api/agent?user=X&id=N — usunięcie pozycji
    if (req.method === 'DELETE' && id) {
      const { rowCount } = await pool.query(
        'DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]
      )
      if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono treningu' })
      return res.json({ ok: true })
    }

    if (req.method === 'POST') {
      const body = req.body || {}

      // POST z kluczem "week" — cały tydzień naraz. Domyślnie dokłada wpisy do
      // istniejącego planu; mode:"replace" najpierw czyści wskazany tydzień.
      if (body.week) {
        const badDay = Object.keys(body.week).find((d) => !VALID_DAYS.includes(d))
        if (badDay) {
          return res.status(400).json({ error: `Nieprawidłowy dzień "${badDay}" — dozwolone: ${VALID_DAYS.join(', ')}` })
        }
        const ws = await toMonday(pool, body.week_start)
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          if (body.mode === 'replace') {
            await client.query('DELETE FROM workouts WHERE user_id = $1 AND week_start = $2', [userId, ws])
          }
          const created = []
          for (const [day, list] of Object.entries(body.week)) {
            for (const w of list || []) created.push(await insertWorkout(client, userId, ws, day, w))
          }
          await client.query('COMMIT')
          return res.status(201).json({ week_start: ws, created: created.length, days: groupByDay(created) })
        } catch (e) {
          await client.query('ROLLBACK').catch(() => {})
          throw e
        } finally {
          client.release()
        }
      }

      // POST pojedynczego wpisu
      if (!VALID_DAYS.includes(body.day)) {
        return res.status(400).json({ error: `Wymagane pole "day" — dozwolone: ${VALID_DAYS.join(', ')}` })
      }
      const ws = await toMonday(pool, body.week_start)
      const row = await insertWorkout(pool, userId, ws, body.day, body)
      return res.status(201).json(row)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Agent API error:', e)
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
