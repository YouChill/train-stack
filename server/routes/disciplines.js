import { Router } from 'express'
import pool from '../db.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

// GET /api/disciplines
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM disciplines WHERE user_id = $1 ORDER BY id', [req.userId]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// PUT /api/disciplines — replace all disciplines (save from CatModal)
router.put('/', async (req, res) => {
  const { disciplines } = req.body
  if (!Array.isArray(disciplines)) return res.status(400).json({ error: 'Wymagana tablica disciplines' })

  try {
    await pool.query('DELETE FROM disciplines WHERE user_id = $1', [req.userId])

    for (const d of disciplines) {
      await pool.query(
        `INSERT INTO disciplines (user_id, ext_id, name, icon, color, has_ex, default_params)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.userId, d.id || d.ext_id, d.name, d.icon || '🏅', d.color || '#60a5fa',
         d.hasEx || false, JSON.stringify(d.dp || d.default_params || [])]
      )
    }

    const { rows } = await pool.query(
      'SELECT * FROM disciplines WHERE user_id = $1 ORDER BY id', [req.userId]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

export default router
