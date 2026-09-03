import getPool from './_db.js'
import { verifyUser, cors } from './_auth.js'
import { rateLimit } from './_ratelimit.js'
import { parseImportBody, importActivities } from './_activities.js'

// POST /api/activities — import aktywności (np. z Garmina) do dziennika
// zalogowanego użytkownika. Body: { activities: [...], dry_run?, tz?,
// default_discipline? } — format opisany w docs/garmin.md. Pliki FIT/CSV są
// parsowane w przeglądarce (src/garmin/parse.js); tu trafia już lista
// znormalizowanych aktywności.
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const pool = getPool()
  const payload = await verifyUser(req, pool)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id

  if (!(await rateLimit(pool, `activities:${userId}`, 30, 60))) {
    return res.status(429).json({ error: 'Za dużo importów — spróbuj za chwilę' })
  }

  const parsed = parseImportBody(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  try {
    const result = await importActivities(pool, userId, parsed.activities, parsed.options)
    return res.status(parsed.options.dryRun ? 200 : 201).json(result)
  } catch (e) {
    console.error('Activities import error:', e)
    return res.status(500).json({ error: 'Błąd serwera' })
  }
}
