import { Router } from 'express'
import pool from '../db.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

// Kolumna workouts.day to VARCHAR(3) — dłuższy klucz (np. "thu_stretch")
// wywalał cały import; walidujemy z góry i zwracamy czytelny błąd.
const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

async function currentMonday() {
  const { rows } = await pool.query("SELECT (date_trunc('week', CURRENT_DATE))::date AS d")
  return rows[0].d
}

// GET /api/workouts?week_start=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const weekStart = req.query.week_start || (await currentMonday())
    const { rows } = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND week_start = $2 ORDER BY id',
      [req.userId, weekStart]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd serwera' })
  }
})

// POST /api/workouts
router.post('/', async (req, res) => {
  const { discipline, day, week_start, title, notes, params, exercises, rest, done } = req.body
  try {
    const ws = week_start || (await currentMonday())
    const { rows } = await pool.query(
      `INSERT INTO workouts (user_id, discipline, day, week_start, title, notes, params, exercises, rest, done)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.userId, discipline, day, ws, title || '', notes || '',
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
  const { week_start, week } = req.body
  if (!week) return res.status(400).json({ error: 'Brak klucza "week"' })
  const badDay = Object.keys(week).find((d) => !VALID_DAYS.includes(d))
  if (badDay) {
    return res.status(400).json({
      error: `Nieprawidłowy dzień "${badDay}" — dozwolone: ${VALID_DAYS.join(', ')}`,
    })
  }

  try {
    const ws = week_start || (await currentMonday())
    await pool.query('DELETE FROM workouts WHERE user_id = $1 AND week_start = $2', [req.userId, ws])

    const inserts = []
    for (const [day, list] of Object.entries(week)) {
      for (const w of list || []) {
        inserts.push(pool.query(
          `INSERT INTO workouts (user_id, discipline, day, week_start, title, notes, params, exercises, rest, done)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [req.userId, w.discipline || '', day, ws, w.title || '', w.notes || '',
           JSON.stringify(w.params || []), JSON.stringify(w.exercises || []), w.rest || false, false]
        ))
      }
    }
    await Promise.all(inserts)

    const { rows } = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND week_start = $2 ORDER BY id',
      [req.userId, ws]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd importu' })
  }
})

export default router
