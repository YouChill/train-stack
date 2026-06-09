// Limiter fixed-window oparty o Postgres — liczy spójnie między instancjami
// serverless bez dodatkowej infrastruktury (Redis itp.). Przy błędzie DB
// przepuszcza ruch (fail-open): dostępność logowania > szczelność limitu.

let tableReady
function ensureTable(pool) {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key          TEXT PRIMARY KEY,
        count        INT NOT NULL DEFAULT 1,
        window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).catch((e) => { tableReady = undefined; throw e })
  }
  return tableReady
}

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

// Zwraca true, gdy żądanie mieści się w limicie `limit` zdarzeń na `windowSec`.
export async function rateLimit(pool, key, limit, windowSec) {
  try {
    await ensureTable(pool)
    const { rows } = await pool.query(
      `INSERT INTO rate_limits AS rl (key, count, window_start)
       VALUES ($1, 1, NOW())
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rl.window_start < NOW() - ($2::int * interval '1 second')
                      THEN 1 ELSE rl.count + 1 END,
         window_start = CASE WHEN rl.window_start < NOW() - ($2::int * interval '1 second')
                             THEN NOW() ELSE rl.window_start END
       RETURNING count`,
      [String(key).slice(0, 255), windowSec]
    )
    // Opportunistyczne sprzątanie starych okien, żeby tabela nie rosła.
    if (Math.random() < 0.02) {
      pool.query(`DELETE FROM rate_limits WHERE window_start < NOW() - interval '1 day'`).catch(() => {})
    }
    return rows[0].count <= limit
  } catch (e) {
    console.error('Rate limit check failed:', e)
    return true
  }
}
