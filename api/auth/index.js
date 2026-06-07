import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import getPool from '../_db.js'
import { signToken, cors } from '../_auth.js'
import { sendMail, resetEmailHtml } from '../_mail.js'

const RESET_TTL_MIN = 60

async function ensureResetTable(pool) {
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

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex')

function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

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

  // POST /api/auth?action=request-reset
  if (action === 'request-reset') {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Wymagany: email' })
    try {
      await ensureResetTable(pool)
      const { rows } = await pool.query(
        'SELECT id, email, name FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      )
      // Always return 200 to avoid leaking whether the email exists.
      if (rows.length) {
        const user = rows[0]
        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = hashToken(token)
        const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000)
        await pool.query(
          'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
          [tokenHash, user.id, expires]
        )
        const link = `${appUrl(req)}/?reset=${token}`
        try {
          await sendMail({
            to: user.email,
            subject: 'Reset hasła – TRAINstack',
            html: resetEmailHtml({ name: user.name, link }),
          })
        } catch (e) {
          console.error('Mail send failed:', e.message)
          // Don't reveal mail failures to the client; still return 200.
        }
      }
      return res.json({ ok: true })
    } catch (e) {
      console.error('request-reset error:', e)
      return res.status(500).json({ error: 'Błąd serwera' })
    }
  }

  // POST /api/auth?action=reset-password
  if (action === 'reset-password') {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'Wymagane: token, password' })
    if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' })
    try {
      await ensureResetTable(pool)
      const tokenHash = hashToken(token)
      const { rows } = await pool.query(
        `SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1`,
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
      // Invalidate other outstanding resets for this user.
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
      return res.json({ user, token: signToken(user.id) })
    } catch (e) {
      console.error('reset-password error:', e)
      return res.status(500).json({ error: 'Błąd serwera' })
    }
  }

  res.status(400).json({ error: 'Nieznana akcja' })
}
