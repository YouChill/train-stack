-- Import aktywności z zewnątrz (Garmin: pliki FIT/CSV oraz skrypt
-- synchronizacji przez /api/agent). Każdy zaimportowany wpis dziennika niesie
-- źródło i identyfikator zewnętrzny, po którym import jest idempotentny —
-- ponowne wgranie tego samego pliku nie tworzy duplikatów.
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_user_external
  ON workout_logs(user_id, external_id) WHERE external_id IS NOT NULL;
