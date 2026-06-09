-- Tabela limitera fixed-window (api/_ratelimit.js). Tworzona też leniwie
-- przez aplikację; tu dla kompletności schematu.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
