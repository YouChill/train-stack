import { Router } from 'express'
import pool from '../db.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

// GET /api/workouts?week=0
router.get('/', async (req, res) => {
  const week = parseInt(req.query.week) || 0
  try {
    const { rows } = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY id',
      [req.userId, week]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// POST /api/workouts
router.post('/', async (req, res) => {
  const { discipline, day, week_offset, title, notes, params, exercises, rest, done } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO workouts (user_id, discipline, day, week_offset, title, notes, params, exercises, rest, done)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.userId, discipline, day, week_offset || 0, title || '', notes || '',
       JSON.stringify(params || []), JSON.stringify(exercises || []), rest || false, done || false]
    )
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// PUT /api/workouts/:id
router.put('/:id', async (req, res) => {
  const { discipline, day, title, notes, params, exercises, rest, done } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE workouts SET discipline=$1, day=$2, title=$3, notes=$4, params=$5, exercises=$6, rest=$7, done=$8
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [discipline, day, title || '', notes || '',
       JSON.stringify(params || []), JSON.stringify(exercises || []), rest || false, done || false,
       req.params.id, req.userId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]
    )
    if (!rowCount) return res.status(404).json({ error: 'Nie znaleziono' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// POST /api/workouts/import  — bulk import for a week
router.post('/import', async (req, res) => {
  const { week_offset, week } = req.body
  const off = week_offset ?? 0
  if (!week) return res.status(400).json({ error: 'Brak klucza "week"' })

  try {
    await pool.query('DELETE FROM workouts WHERE user_id = $1 AND week_offset = $2', [req.userId, off])

    const inserts = []
    for (const [day, list] of Object.entries(week)) {
      for (const w of list || []) {
        inserts.push(pool.query(
          `INSERT INTO workouts (user_id, discipline, day, week_offset, title, notes, params, exercises, rest, done)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [req.userId, w.discipline || '', day, off, w.title || '', w.notes || '',
           JSON.stringify(w.params || []), JSON.stringify(w.exercises || []), w.rest || false, false]
        ))
      }
    }
    await Promise.all(inserts)

    const { rows } = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY id',
      [req.userId, off]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd importu' })
  }
})

export default router
