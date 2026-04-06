import getPool from './_db.js'

export default async function handler(req, res) {
  try {
    const pool = getPool()
    await pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS start_time VARCHAR(5) DEFAULT '';
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT 'null';
    `)
    res.json({ status: 'ok', message: 'Migration complete' })
  } catch (e) {
    res.json({ status: 'error', error: e.message })
  }
}
