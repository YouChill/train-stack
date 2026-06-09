import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import getPool from '../_db.js'
import { signToken, cors } from '../_auth.js'
import { rateLimit, clientIp } from '../_ratelimit.js'
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

// Linki resetujące budujemy wyłącznie z APP_URL — fallback na nagłówki
// x-forwarded-* pozwalałby atakującemu podstawić własną domenę w mailu
// (password reset poisoning).
function appUrl() {
  if (!process.env.APP_URL) {
    throw new Error('APP_URL nie jest skonfigurowany — wymagany do linków resetujących')
  }
  return process.env.APP_URL.replace(/\/$/, '')
}

const MIN_PASSWORD_LENGTH = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RATE_LIMITED = { error: 'Zbyt wiele prób. Spróbuj ponownie później.' }

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
    const emailNorm = String(email).toLowerCase().trim()
    const nameNorm = String(name).trim()
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 255) {
      return res.status(400).json({ error: 'Nieprawidłowy adres email' })
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Hasło musi mieć min. ${MIN_PASSWORD_LENGTH} znaków` })
    }
    if (!nameNorm || nameNorm.length > 100) {
      return res.status(400).json({ error: 'Imię musi mieć od 1 do 100 znaków' })
    }
    if (!(await rateLimit(pool, `register:ip:${clientIp(req)}`, 5, 3600))) {
      return res.status(429).json(RATE_LIMITED)
    }
    try {
      const hash = await bcrypt.hash(password, 10)
      const { rows } = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [emailNorm, hash, nameNorm]
      )
      const user = rows[0]
      return res.status(201).json({ user, token: signToken(user.id) })
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email już istnieje' })
      console.error('Register error:', e)
      return res.status(500).json({ error: 'Błąd serwera' })
    }
  }

  // POST /api/auth?action=login
  if (action === 'login') {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Wymagane: email, password' })
    const emailNorm = String(email).toLowerCase().trim()
    const [ipOk, emailOk] = await Promise.all([
      rateLimit(pool, `login:ip:${clientIp(req)}`, 20, 900),
      rateLimit(pool, `login:email:${emailNorm}`, 10, 900),
    ])
    if (!ipOk || !emailOk) return res.status(429).json(RATE_LIMITED)
    try {
      const { rows } = await pool.query(
        'SELECT id, email, name, password FROM users WHERE email = $1',
        [emailNorm]
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
    const emailNorm = String(email).toLowerCase().trim()
    // Limit per email i per IP: każde trafienie wysyła prawdziwy mail z naszego
    // konta Gmail, więc bez limitu endpoint nadaje się do mail-bombingu.
    const [ipOk, emailOk] = await Promise.all([
      rateLimit(pool, `reset-req:ip:${clientIp(req)}`, 10, 3600),
      rateLimit(pool, `reset-req:email:${emailNorm}`, 3, 3600),
    ])
    if (!ipOk || !emailOk) return res.status(429).json(RATE_LIMITED)
    try {
      await ensureResetTable(pool)
      const { rows } = await pool.query(
        'SELECT id, email, name FROM users WHERE email = $1',
        [emailNorm]
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
        const link = `${appUrl()}/?reset=${token}`
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
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Hasło musi mieć min. ${MIN_PASSWORD_LENGTH} znaków` })
    }
    if (!(await rateLimit(pool, `reset-pw:ip:${clientIp(req)}`, 10, 3600))) {
      return res.status(429).json(RATE_LIMITED)
    }
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
