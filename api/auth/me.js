import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Nieprawidłowy token' })

  try {
    const pool = getPool()
    const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [payload.id])
    if (!rows.length) return res.status(401).json({ error: 'Użytkownik nie istnieje' })
    res.json({ user: rows[0] })
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
