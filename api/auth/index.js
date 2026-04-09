import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import getPool from '../_db.js'
import { signToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query
  const pool = getPool()

  // GET /api/auth?action=me
  if (action === 'me') {
    const h = req.headers.authorization
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Brak tokenu' })
    try {
      const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET)
      const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [id])
      if (!rows.length) return res.status(401).json({ error: 'Użytkownik nie istnieje' })
      return res.json({ user: rows[0] })
    } catch {
      return res.status(401).json({ error: 'Nieprawidłowy token' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // POST /api/auth?action=register
  if (action === 'register') {
    const { email, password, name } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'Wymagane: email, password, name' })
    try {
      const hash = await bcrypt.hash(password, 10)
      const { rows } = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase().trim(), hash, name.trim()]
      )
      const user = rows[0]
      return res.status(201).json({ user, token: signToken(user.id) })
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email już istnieje' })
      console.error('Register error:', e)
      return res.status(500).json({ error: 'Błąd serwera', detail: e.message })
    }
  }

  // POST /api/auth?action=login
  if (action === 'login') {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Wymagane: email, password' })
    try {
      const { rows } = await pool.query(
        'SELECT id, email, name, password FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      )
      if (!rows.length) return res.status(401).json({ error: 'Nieprawidłowe dane' })
      const user = rows[0]
      const ok = await bcrypt.compare(password, user.password)
      if (!ok) return res.status(401).json({ error: 'Nieprawidłowe dane' })
      return res.json({ user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) })
    } catch {
      return res.status(500).json({ error: 'Błąd serwera' })
    }
  }

  res.status(400).json({ error: 'Nieznana akcja' })
}
