CREATE TABLE IF NOT EXISTS exercise_logs (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  workout_id    INT REFERENCES workouts(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  logged_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  sets          JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_logs_unique UNIQUE (user_id, exercise_name, logged_date)
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_name ON exercise_logs(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, logged_date DESC);
