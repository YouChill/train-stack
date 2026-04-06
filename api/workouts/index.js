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
    if (req.method === 'GET') {
      const week = parseInt(req.query.week) || 0
      const { rows } = await pool.query(
        'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY start_time ASC NULLS LAST, id',
        [userId, week]
      )
      return res.json(rows)
    }

    if (req.method === 'POST') {
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
