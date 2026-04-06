import bcrypt from 'bcryptjs'
import getPool from '../_db.js'
import { signToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Wymagane: email, password' })

  try {
    const pool = getPool()
    const { rows } = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!rows.length) return res.status(401).json({ error: 'Nieprawidłowe dane' })

    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Nieprawidłowe dane' })

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) })
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
