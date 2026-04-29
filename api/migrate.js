import getPool from './_db.js'
import { verifyToken, cors } from './_auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Wymagane logowanie' })

  try {
    const pool = getPool()
    await pool.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS start_time VARCHAR(5) DEFAULT '';
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT 'null';
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INT REFERENCES users(id) ON DELETE CASCADE,
        workout_id  INT REFERENCES workouts(id) ON DELETE CASCADE,
        logged_at   TIMESTAMPTZ DEFAULT NOW(),
        note        TEXT DEFAULT '',
        feeling     SMALLINT DEFAULT 3,
        actual_params  JSONB DEFAULT '[]',
        actual_exercises JSONB DEFAULT '[]'
      );
      CREATE INDEX IF NOT EXISTS idx_logs_user ON workout_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_workout ON workout_logs(workout_id);
    `)
    await pool.query(`ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;`)
    res.json({ status: 'ok', message: 'All migrations complete' })
  } catch (e) {
    res.json({ status: 'error', error: e.message })
  }
}
