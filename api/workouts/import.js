import getPool from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id
  const pool = getPool()

  const { week_offset, week } = req.body
  const off = week_offset ?? 0
  if (!week) return res.status(400).json({ error: 'Brak klucza "week"' })

  try {
    await pool.query('DELETE FROM workouts WHERE user_id = $1 AND week_offset = $2', [userId, off])

    const inserts = []
    for (const [day, list] of Object.entries(week)) {
      for (const w of list || []) {
        inserts.push(pool.query(
          `INSERT INTO workouts (user_id, discipline, day, week_offset, title, notes, params, exercises, rest, done, start_time, recurrence)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [userId, w.discipline || '', day, off, w.title || '', w.notes || '',
           JSON.stringify(w.params || []), JSON.stringify(w.exercises || []), w.rest || false, false,
           w.start_time || '', JSON.stringify(w.recurrence || null)]
        ))
      }
    }
    await Promise.all(inserts)

    const { rows } = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 AND week_offset = $2 ORDER BY id',
      [userId, off]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Błąd importu' })
  }
}
