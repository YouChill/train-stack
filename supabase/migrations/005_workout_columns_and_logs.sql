-- Zastępuje usunięty endpoint api/migrate.js: kolumny dodawane historycznie
-- "w locie" oraz tabela workout_logs, zapisane jako normalna migracja.
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS start_time VARCHAR(5) DEFAULT '';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT 'null';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS week_start DATE;

UPDATE workouts
  SET week_start = (date_trunc('week', CURRENT_DATE))::date + (COALESCE(week_offset, 0) * 7)
  WHERE week_start IS NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_user_weekstart ON workouts(user_id, week_start);

CREATE TABLE IF NOT EXISTS workout_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  workout_id  INT REFERENCES workouts(id) ON DELETE CASCADE,
  logged_at   TIMESTAMPTZ DEFAULT NOW(),
  note        TEXT DEFAULT '',
  feeling     SMALLINT DEFAULT 3,
  actual_params    JSONB DEFAULT '[]',
  actual_exercises JSONB DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_logs_user ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_workout ON workout_logs(workout_id);
