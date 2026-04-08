import getPool from './_db.js'
import { verifyToken, cors } from './_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const pool = getPool()

  try {
    // Total workouts logged
    const totals = await pool.query(
      `SELECT COUNT(*) as total_logs,
              AVG(feeling) as avg_feeling,
              COUNT(DISTINCT workout_id) as unique_workouts
       FROM workout_logs WHERE user_id = $1`,
      [payload.id]
    )

    // Per-discipline breakdown
    const byDisc = await pool.query(
      `SELECT w.discipline, COUNT(wl.id) as count, AVG(wl.feeling) as avg_feeling
       FROM workout_logs wl
       JOIN workouts w ON w.id = wl.workout_id
       WHERE wl.user_id = $1
       GROUP BY w.discipline
       ORDER BY count DESC`,
      [payload.id]
    )

    // Weekly trend (last 8 weeks)
    const weekly = await pool.query(
      `SELECT DATE_TRUNC('week', wl.logged_at) as week,
              COUNT(*) as count,
              AVG(wl.feeling) as avg_feeling
       FROM workout_logs wl
       WHERE wl.user_id = $1 AND wl.logged_at > NOW() - INTERVAL '8 weeks'
       GROUP BY week
       ORDER BY week`,
      [payload.id]
    )

    res.json({
      totals: totals.rows[0],
      byDiscipline: byDisc.rows,
      weeklyTrend: weekly.rows,
    })
  } catch (e) {
    console.error('Stats error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
