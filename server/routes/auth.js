import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { sendMail, resetEmailHtml } from '../mail.js'

const router = Router()

const RESET_TTL_MIN = 60

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex')

async function ensureResetTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash  TEXT PRIMARY KEY,
      user_id     INT REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TIMESTAMPTZ NOT NULL,
      used_at     TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
  `)
}

function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

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

// POST /api/auth/request-reset
router.post('/request-reset', async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Wymagany: email' })
  try {
    await ensureResetTable()
    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (rows.length) {
      const user = rows[0]
      const raw = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(raw)
      const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000)
      await pool.query(
        'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash, user.id, expires]
      )
      const link = `${appUrl(req)}/?reset=${raw}`
      try {
        await sendMail({
          to: user.email,
          subject: 'Reset hasła – TRAINstack',
          html: resetEmailHtml({ name: user.name, link }),
        })
      } catch (e) {
        console.error('Mail send failed:', e.message)
      }
    }
    res.json({ ok: true })
  } catch (e) {
    console.error('request-reset error:', e)
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token: raw, password } = req.body || {}
  if (!raw || !password) return res.status(400).json({ error: 'Wymagane: token, password' })
  if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' })
  try {
    await ensureResetTable()
    const tokenHash = hashToken(raw)
    const { rows } = await pool.query(
      'SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1',
      [tokenHash]
    )
    if (!rows.length) return res.status(400).json({ error: 'Nieprawidłowy lub wygasły link' })
    const r = rows[0]
    if (r.used_at) return res.status(400).json({ error: 'Link został już użyty' })
    if (new Date(r.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Link wygasł' })
    }
    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, r.user_id])
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1', [tokenHash])
    await pool.query(
      `UPDATE password_resets SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [r.user_id]
    )
    const { rows: urows } = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [r.user_id]
    )
    const user = urows[0]
    res.json({ user, token: token(user.id) })
  } catch (e) {
    console.error('reset-password error:', e)
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
