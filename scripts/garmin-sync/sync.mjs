// Synchronizacja aktywności z Garmin Connect do TrainStack.
//
// Korzysta z nieoficjalnej biblioteki `garmin-connect` (Garmin wstrzymał
// przyjmowanie wniosków do oficjalnego Connect Developer Program), dlatego
// skrypt jest pomyślany do uruchamiania lokalnie lub na własnym cronie —
// hasło i tokeny Garmina nigdy nie trafiają na serwer TrainStack. Do aplikacji
// idą już tylko znormalizowane podsumowania przez POST /api/agent?action=activities.
//
// Użycie: node --env-file=.env sync.mjs [--dry-run] [--since YYYY-MM-DD] [--limit N]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GarminConnect } from 'garmin-connect'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def }

const env = (k, def) => (process.env[k] && process.env[k].trim()) || def
const URL_BASE = env('TRAINSTACK_URL', '').replace(/\/$/, '')
const API_KEY = env('AGENT_API_KEY', '')
const USER = env('TRAINSTACK_USER', '')
const TOKEN_DIR = path.resolve(HERE, env('GARMIN_TOKEN_DIR', '.garmin-tokens'))
const STATE_FILE = path.join(HERE, '.sync-state.json')
const DRY_RUN = flag('--dry-run')
const LIMIT = Number(opt('--limit', env('SYNC_LIMIT', '100')))
const DAYS = Number(env('SYNC_DAYS', '14'))
const TZ = env('SYNC_TZ', 'Europe/Warsaw')
const DEFAULT_DISC = env('SYNC_DEFAULT_DISCIPLINE', '')

for (const [k, v] of Object.entries({ TRAINSTACK_URL: URL_BASE, AGENT_API_KEY: API_KEY, TRAINSTACK_USER: USER })) {
  if (!v) { console.error(`Brak zmiennej ${k} — patrz .env.example`); process.exit(1) }
}

const readJson = (f, def) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return def } }

// ── Garmin: logowanie z tokenami trzymanymi lokalnie ────────────────────────
async function garminClient() {
  const gc = new GarminConnect({ username: env('GARMIN_EMAIL', ''), password: env('GARMIN_PASSWORD', '') })
  const tokensPresent = existsSync(path.join(TOKEN_DIR, 'oauth1_token.json'))
  if (tokensPresent) {
    gc.loadTokenByFile(TOKEN_DIR)
    return gc
  }
  if (!env('GARMIN_EMAIL') || !env('GARMIN_PASSWORD')) {
    throw new Error(`Brak zapisanych tokenów w ${TOKEN_DIR} i brak GARMIN_EMAIL/GARMIN_PASSWORD do pierwszego logowania`)
  }
  console.log('Loguję do Garmin Connect (pierwsze uruchomienie)...')
  await gc.login()
  mkdirSync(TOKEN_DIR, { recursive: true })
  gc.exportTokenToFile(TOKEN_DIR)
  console.log(`Zapisano tokeny w ${TOKEN_DIR} — kolejne uruchomienia nie potrzebują hasła.`)
  return gc
}

async function fetchActivities(gc, limit) {
  try {
    return await gc.getActivities(0, limit)
  } catch (e) {
    // Wygasłe tokeny: spróbuj zalogować ponownie hasłem, jeśli jest.
    if (env('GARMIN_EMAIL') && env('GARMIN_PASSWORD')) {
      console.warn('Pobieranie nie powiodło się, ponawiam logowanie hasłem...')
      await gc.login()
      gc.exportTokenToFile(TOKEN_DIR)
      return gc.getActivities(0, limit)
    }
    throw e
  }
}

// ── Mapowanie na format /api/activities (docs/garmin.md) ────────────────────
const isoLocal = (s) => (s ? String(s).replace(' ', 'T').slice(0, 19) : null)
const toActivity = (a) => ({
  external_id: `gc:${a.activityId}`,
  source: 'garmin-connect',
  started_at_local: isoLocal(a.startTimeLocal),
  started_at: a.startTimeGMT ? `${isoLocal(a.startTimeGMT)}Z` : undefined,
  type: a.activityType?.typeKey || '',
  title: a.activityName || '',
  duration_s: a.duration ?? a.elapsedDuration ?? null,
  distance_m: a.distance ?? null,
  avg_hr: a.averageHR ?? null,
  max_hr: a.maxHR ?? null,
  calories: a.calories ?? null,
})

async function pushActivities(activities) {
  const url = `${URL_BASE}/api/agent?user=${encodeURIComponent(USER)}&action=activities`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ activities, dry_run: DRY_RUN, tz: TZ, default_discipline: DEFAULT_DISC || undefined }),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(`Nieprawidłowa odpowiedź serwera (${res.status}): ${text.slice(0, 200)}`) }
  if (!res.ok) throw new Error(`${res.status}: ${data.error || text}`)
  return data
}

// ── Główny przebieg ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (e) => { console.error('Błąd:', e?.message || e); process.exit(1) })
const state = readJson(STATE_FILE, {})
const sinceArg = opt('--since', null)
// Od ostatniej zsynchronizowanej aktywności (wyłącznie), a przy --since lub
// pierwszym uruchomieniu od podanej daty włącznie.
const fromState = !sinceArg && !!state.last_started_at_local
const since = sinceArg
  ? `${sinceArg}T00:00:00`
  : state.last_started_at_local || new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 19)

console.log(`TrainStack: ${URL_BASE} (użytkownik ${USER})${DRY_RUN ? ' — DRY RUN' : ''}`)
console.log(`Pobieram aktywności ${fromState ? 'nowsze niż' : 'od'} ${since.replace('T', ' ')} (limit ${LIMIT})`)

const gc = await garminClient()
const raw = await fetchActivities(gc, LIMIT)
const fresh = raw
  .map(toActivity)
  .filter((a) => a.started_at_local && (fromState ? a.started_at_local > since : a.started_at_local >= since))
  .sort((a, b) => a.started_at_local.localeCompare(b.started_at_local))

if (!fresh.length) {
  console.log('Brak nowych aktywności.')
  process.exit(0)
}
console.log(`Nowych aktywności w Garminie: ${fresh.length}`)

const result = await pushActivities(fresh)
const LABEL = { matched: 'dopasowano', created: 'nowy trening', duplicate: 'duplikat', skipped: 'pominięto', invalid: 'błąd' }
for (const r of result.results) {
  const a = fresh[r.index]
  const what = a.title || a.type
  const extra = r.status === 'matched' && r.workout ? ` → ${r.workout.title}` : r.reason ? ` (${r.reason})` : ''
  console.log(`  ${a.started_at_local.replace('T', ' ').slice(0, 16)}  ${what.padEnd(28).slice(0, 28)}  ${LABEL[r.status] || r.status}${extra}`)
}
const s = result.summary
console.log(`Razem: dopasowano ${s.matched}, nowe ${s.created}, duplikaty ${s.duplicate}, pominięte ${s.skipped}, błędy ${s.invalid}`)

if (!DRY_RUN) {
  // Pomijamy w stanie aktywności bez dyscypliny: po dodaniu dyscypliny
  // w aplikacji kolejne uruchomienie je dociągnie.
  const done = result.results.filter((r) => r.status !== 'skipped' && r.status !== 'invalid').map((r) => fresh[r.index].started_at_local)
  if (done.length) {
    writeFileSync(STATE_FILE, JSON.stringify({ last_started_at_local: done.sort().at(-1), updated_at: new Date().toISOString() }, null, 2))
  }
}
