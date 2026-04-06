import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id
  const { id } = req.query
  const pool = getPool()

  try {
    if (req.method === 'PUT') {
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

    if (req.method === 'DELETE') {
      const { rowCount } = await pool.query(
        'DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]
      )
      if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Workout update error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
