import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id
  const pool = getPool()

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        'SELECT * FROM disciplines WHERE user_id = $1 ORDER BY id', [userId]
      )
      return res.json(rows)
    }

    if (req.method === 'PUT') {
      const { disciplines } = req.body
      if (!Array.isArray(disciplines)) return res.status(400).json({ error: 'Wymagana tablica disciplines' })

      await pool.query('DELETE FROM disciplines WHERE user_id = $1', [userId])

      for (const d of disciplines) {
        await pool.query(
          `INSERT INTO disciplines (user_id, ext_id, name, icon, color, has_ex, default_params)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [userId, d.id || d.ext_id, d.name, d.icon || '🏅', d.color || '#60a5fa',
           d.hasEx || false, JSON.stringify(d.dp || d.default_params || [])]
        )
      }

      const { rows } = await pool.query(
        'SELECT * FROM disciplines WHERE user_id = $1 ORDER BY id', [userId]
      )
      return res.json(rows)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
