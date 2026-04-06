import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const router = Router()

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Wymagane: email, password, name' })
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase().trim(), hash, name.trim()]
    )
    const user = rows[0]
    res.status(201).json({ user, token: token(user.id) })
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email już istnieje' })
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Wymagane: email, password' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, password FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!rows.length) return res.status(401).json({ error: 'Nieprawidłowe dane' })

    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Nieprawidłowe dane' })

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token: token(user.id) })
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Brak tokenu' })

  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [id])
    if (!rows.length) return res.status(401).json({ error: 'Użytkownik nie istnieje' })
    res.json({ user: rows[0] })
  } catch {
    res.status(401).json({ error: 'Nieprawidłowy token' })
  }
})

export default router
