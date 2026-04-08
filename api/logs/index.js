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
    // GET /api/logs?workout_id=X  — get logs for a workout
    // GET /api/logs?all=1         — get all user logs (for stats)
    if (req.method === 'GET') {
      const { workout_id, all } = req.query
      if (all) {
        const { rows } = await pool.query(
          `SELECT wl.*, w.title, w.discipline, w.day, w.week_offset, w.start_time
           FROM workout_logs wl
           JOIN workouts w ON w.id = wl.workout_id
           WHERE wl.user_id = $1
           ORDER BY wl.logged_at DESC
           LIMIT 200`,
          [userId]
        )
        return res.json(rows)
      }
      if (workout_id) {
        const { rows } = await pool.query(
          'SELECT * FROM workout_logs WHERE user_id = $1 AND workout_id = $2 ORDER BY logged_at DESC',
          [userId, workout_id]
        )
        return res.json(rows)
      }
      return res.status(400).json({ error: 'Podaj workout_id lub all=1' })
    }

    // POST /api/logs — save a workout log
    if (req.method === 'POST') {
      const { workout_id, note, feeling, actual_params, actual_exercises } = req.body
      if (!workout_id) return res.status(400).json({ error: 'Wymagane: workout_id' })

      const { rows } = await pool.query(
        `INSERT INTO workout_logs (user_id, workout_id, note, feeling, actual_params, actual_exercises)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [userId, workout_id, note || '', feeling || 3,
         JSON.stringify(actual_params || []), JSON.stringify(actual_exercises || [])]
      )
      return res.status(201).json(rows[0])
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Logs error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
