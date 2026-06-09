import getPool from '../_db.js'
import { verifyUser, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const pool = getPool()
  const payload = await verifyUser(req, pool)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id

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

      // DELETE + INSERT w jednej transakcji — błąd w połowie nie może
      // zostawić użytkownika bez dyscyplin.
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('DELETE FROM disciplines WHERE user_id = $1', [userId])
        for (const d of disciplines) {
          await client.query(
            `INSERT INTO disciplines (user_id, ext_id, name, icon, color, has_ex, default_params)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [userId, d.id || d.ext_id, d.name, d.icon || '🏅', d.color || '#60a5fa',
             d.hasEx || false, JSON.stringify(d.dp || d.default_params || [])]
          )
        }
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {})
        throw e
      } finally {
        client.release()
      }

      const { rows } = await pool.query(
        'SELECT * FROM disciplines WHERE user_id = $1 ORDER BY id', [userId]
      )
      return res.json(rows)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Disciplines error:', e)
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
