import bcrypt from 'bcrypt'
import getPool from '../_db.js'
import { signToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, name } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: 'Wymagane: email, password, name' })

  try {
    const pool = getPool()
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase().trim(), hash, name.trim()]
    )
    const user = rows[0]
    res.status(201).json({ user, token: signToken(user.id) })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email już istnieje' })
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
