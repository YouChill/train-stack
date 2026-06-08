import { Router } from 'express'
import pool from '../db.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

router.get('/', async (req, res) => {
  if (req.query.names) {
    try {
      const { rows } = await pool.query(
        `SELECT name, MAX(last_logged) AS last_logged, SUM(cnt)::int AS cnt
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
         GROUP BY name
         ORDER BY last_logged DESC NULLS LAST, cnt DESC, name ASC
         LIMIT 200`,
        [req.userId]
      )
      return res.json(rows.map((r) => r.name))
    } catch { return res.status(500).json({ error: 'Błąd serwera' }) }
  }

  const { exercise_name } = req.query
  if (!exercise_name) return res.status(400).json({ error: 'Podaj exercise_name' })
  try {
    const { rows } = await pool.query(
      `SELECT * FROM exercise_logs
       WHERE user_id = $1 AND exercise_name = $2
       ORDER BY logged_date DESC LIMIT 20`,
      [req.userId, exercise_name]
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Błąd serwera' }) }
})

router.post('/', async (req, res) => {
  const { workout_id, exercise_name, logged_date, sets } = req.body
  if (!exercise_name) return res.status(400).json({ error: 'Wymagane: exercise_name' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO exercise_logs (user_id, workout_id, exercise_name, logged_date, sets)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, exercise_name, logged_date)
       DO UPDATE SET sets = EXCLUDED.sets, workout_id = EXCLUDED.workout_id
       RETURNING *`,
      [req.userId, workout_id || null, exercise_name,
       logged_date || new Date().toISOString().slice(0, 10),
       JSON.stringify(sets || [])]
    )
    res.status(201).json(rows[0])
  } catch { res.status(500).json({ error: 'Błąd serwera' }) }
})

router.put('/:id', async (req, res) => {
  const { sets, logged_date } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE exercise_logs SET sets=$1, logged_date=$2
       WHERE id=$3 AND user_id=$4 RETURNING *`,
      [JSON.stringify(sets || []), logged_date, req.params.id, req.userId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' })
    res.json(rows[0])
  } catch { res.status(500).json({ error: 'Błąd serwera' }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM exercise_logs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Błąd serwera' }) }
})

export default router
