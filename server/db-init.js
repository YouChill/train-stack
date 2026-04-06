import pool from './db.js'

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplines (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  ext_id      VARCHAR(50) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10) DEFAULT '🏅',
  color       VARCHAR(20) DEFAULT '#60a5fa',
  has_ex      BOOLEAN DEFAULT FALSE,
  default_params JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS workouts (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  discipline  VARCHAR(50) NOT NULL,
  day         VARCHAR(3) NOT NULL,
  week_offset INT DEFAULT 0,
  title       VARCHAR(255) DEFAULT '',
  notes       TEXT DEFAULT '',
  params      JSONB DEFAULT '[]',
  exercises   JSONB DEFAULT '[]',
  rest        BOOLEAN DEFAULT FALSE,
  done        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_week ON workouts(user_id, week_offset);
CREATE INDEX IF NOT EXISTS idx_disciplines_user ON disciplines(user_id);
`

try {
  await pool.query(SQL)
  console.log('Database initialized successfully')
} catch (e) {
  console.error('DB init error:', e.message)
} finally {
  await pool.end()
}
