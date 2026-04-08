import getPool from './_db.js'

export default async function handler(req, res) {
  try {
    const pool = getPool()
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
    res.json({ status: 'ok', message: 'Workout logs table created' })
  } catch (e) {
    res.json({ status: 'error', error: e.message })
  }
}
