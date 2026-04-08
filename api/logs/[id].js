import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const { id } = req.query
  const pool = getPool()

  try {
    if (req.method === 'PUT') {
      const { note, feeling, actual_params, actual_exercises } = req.body
      const { rows } = await pool.query(
        `UPDATE workout_logs SET note=$1, feeling=$2, actual_params=$3, actual_exercises=$4
         WHERE id=$5 AND user_id=$6 RETURNING *`,
        [note || '', feeling || 3,
         JSON.stringify(actual_params || []), JSON.stringify(actual_exercises || []),
         id, payload.id]
      )
      if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json(rows[0])
    }

    if (req.method === 'DELETE') {
      const { rowCount } = await pool.query(
        'DELETE FROM workout_logs WHERE id = $1 AND user_id = $2', [id, payload.id]
      )
      if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Log update error:', e)
    res.status(500).json({ error: 'Błąd serwera', detail: e.message })
  }
}
