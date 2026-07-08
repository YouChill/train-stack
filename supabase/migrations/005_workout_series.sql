-- Treningi cykliczne są materializowane jako osobne wiersze (12 tygodni do
-- przodu) bez wspólnego identyfikatora — nie dało się usunąć całej serii.
-- series_id spina wszystkie wystąpienia jednej serii; starsze wpisy zostają
-- z NULL i są dopasowywane po atrybutach (patrz api/workouts).
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS series_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workouts_user_series ON workouts(user_id, series_id);
