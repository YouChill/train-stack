import getPool from './_db.js'
import { verifyToken, cors } from './_auth.js'

// Normalizacja nazw ćwiczeń — żeby ta sama nazwa nie rozdzielała historii
// przez wielkość liter albo nadmiarowe spacje. cleanName zachowuje pisownię
// (do wyświetlania), normName służy tylko do porównań.
const cleanName = (s) => (s || '').trim().replace(/\s+/g, ' ')
const normName  = (s) => cleanName(s).toLowerCase()
// To samo porównanie po stronie SQL, dla istniejących (jeszcze nieznormalizowanych) wierszy.
const NORM = (col) => `lower(btrim(regexp_replace(${col}, '\\s+', ' ', 'g')))`

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id
  const pool = getPool()

  try {
    const { id } = req.query

    if (req.method === 'DELETE' && id) {
      const { rowCount } = await pool.query(
        'DELETE FROM exercise_logs WHERE id = $1 AND user_id = $2', [id, userId]
      )
      if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json({ ok: true })
    }

    if (req.method === 'PUT' && id) {
      const { sets, logged_date } = req.body
      const { rows } = await pool.query(
        `UPDATE exercise_logs SET sets=$1, logged_date=$2
         WHERE id=$3 AND user_id=$4 RETURNING *`,
        [JSON.stringify(sets || []), logged_date, id, userId]
      )
      if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json(rows[0])
    }

    if (req.method === 'GET' && req.query.names) {
      const { rows } = await pool.query(
        `SELECT (array_agg(name ORDER BY last_logged DESC NULLS LAST, cnt DESC))[1] AS name,
                MAX(last_logged) AS last_logged, SUM(cnt) AS cnt
         FROM (
           SELECT exercise_name AS name, MAX(logged_date)::text AS last_logged, COUNT(*) AS cnt
           FROM exercise_logs
           WHERE user_id = $1
           GROUP BY exercise_name
           UNION ALL
           SELECT btrim(e->>'name') AS name, NULL::text AS last_logged, COUNT(*) AS cnt
           FROM workouts w
           CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.exercises, '[]'::jsonb)) AS e
           WHERE w.user_id = $1 AND COALESCE(btrim(e->>'name'), '') <> ''
           GROUP BY btrim(e->>'name')
         ) t
         GROUP BY ${NORM('name')}
         ORDER BY MAX(last_logged) DESC NULLS LAST, SUM(cnt) DESC
         LIMIT 200`,
        [userId]
      )
      return res.json(rows.map((r) => r.name))
    }

    if (req.method === 'GET') {
      const { exercise_name } = req.query
      if (!exercise_name) return res.status(400).json({ error: 'Podaj exercise_name' })
      const { rows } = await pool.query(
        `SELECT * FROM exercise_logs
         WHERE user_id = $1 AND ${NORM('exercise_name')} = $2
         ORDER BY logged_date DESC LIMIT 20`,
        [userId, normName(exercise_name)]
      )
      return res.json(rows)
    }

    if (req.method === 'POST') {
      const { workout_id, exercise_name, logged_date, sets } = req.body
      const cleaned = cleanName(exercise_name)
      if (!cleaned) return res.status(400).json({ error: 'Wymagane: exercise_name' })

      // Jeśli pod tą nazwą (z dokładnością do wielkości liter i spacji) istnieje
      // już historia, dopisz pod pierwotną pisownią — żeby nie rozdzielać wpisów.
      const { rows: existing } = await pool.query(
        `SELECT exercise_name FROM exercise_logs
         WHERE user_id = $1 AND ${NORM('exercise_name')} = $2
         ORDER BY logged_date ASC, id ASC LIMIT 1`,
        [userId, normName(cleaned)]
      )
      const canonical = existing[0]?.exercise_name || cleaned

      const { rows } = await pool.query(
        `INSERT INTO exercise_logs (user_id, workout_id, exercise_name, logged_date, sets)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id, exercise_name, logged_date)
         DO UPDATE SET sets = EXCLUDED.sets, workout_id = EXCLUDED.workout_id
         RETURNING *`,
        [userId, workout_id || null, canonical,
         logged_date || new Date().toISOString().slice(0, 10),
         JSON.stringify(sets || [])]
      )
      return res.status(201).json(rows[0])
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Exercise logs error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
