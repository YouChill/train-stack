import { sanitizeText } from './_sanitize.js'
import { DEFAULT_DISCIPLINES } from '../src/constants.js'

// Import aktywności z zewnętrznych źródeł (Garmin: FIT/CSV z przeglądarki,
// skrypt synchronizacji przez /api/agent). Wejściem jest znormalizowana lista
// aktywności — parsowanie plików dzieje się po stronie klienta, więc endpointy
// serverless nie muszą obsługiwać multipart ani dużych binariów.
//
// Każda aktywność jest dopasowywana do zaplanowanego treningu z tego samego
// dnia i dyscypliny (wpis dziennika + oznaczenie "wykonane"), a bez dopasowania
// tworzy trening ad hoc oznaczony jako wykonany. Duplikaty wykrywane są po
// external_id oraz po zbliżonym czasie startu (ten sam trening z FIT i z API
// ma różne identyfikatory).

export const MAX_ACTIVITIES = 500
export const DEFAULT_TZ = 'Europe/Warsaw'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const TZ_RE = /^[A-Za-z][A-Za-z0-9_+/-]{0,40}$/
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
const SOURCE_RE = /^[a-z0-9-]{1,30}$/
const NEAR_DUPLICATE_MIN = 5

// Grupy sportów: słowa kluczowe typu aktywności (Garmin typeKey, FIT
// sport/subSport, zlokalizowane nazwy z CSV) → słowa kluczowe dyscypliny
// użytkownika (ext_id lub nazwa). Kolejność ma znaczenie — "rower" musi trafić
// do roweru zanim "row" (rowing) dopasuje siłownię.
const GROUPS = [
  { key: 'run',     type: ['run', 'bieg', 'jog', 'treadmill', 'biezn'],                                              disc: ['run', 'bieg'],                                   distUnit: 'km', pace: true },
  { key: 'swim',    type: ['swim', 'plyw', 'basen', 'openwater'],                                                   disc: ['swim', 'plyw'],                                  distUnit: 'm' },
  { key: 'bike',    type: ['cycl', 'bik', 'ride', 'rower', 'kolar', 'spin', 'velo'],                                disc: ['bike', 'cycl', 'rower', 'kolar'],                distUnit: 'km' },
  { key: 'box',     type: ['box', 'boks', 'mma', 'martial', 'kick'],                                                disc: ['box', 'boks'] },
  { key: 'stretch', type: ['yoga', 'joga', 'stretch', 'rozciag', 'flexib', 'pilates', 'mobil', 'breath', 'oddech', 'medit'], disc: ['stretch', 'rozciag', 'yoga', 'joga', 'mobil'] },
  { key: 'walk',    type: ['walk', 'hik', 'chod', 'spacer', 'wedrow', 'marsz', 'trek'],                             disc: ['walk', 'chod', 'spacer', 'marsz', 'hik', 'wedrow'], distUnit: 'km' },
  { key: 'gym',     type: ['strength', 'silow', 'weight', 'gym', 'fitness', 'cardio', 'hiit', 'crossfit', 'ellipt', 'stair', 'row', 'training', 'trening', 'indoor'], disc: ['gym', 'silow', 'strength', 'fitness'] },
]

// "Trail Running", "trail_running", "Bieganie w terenie" → "trailrunning" /
// "bieganiewterenie": bez wielkości liter, ogonków i separatorów.
export function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function detectGroup(type) {
  const t = normKey(type)
  if (!t) return null
  return GROUPS.find((g) => g.type.some((k) => t.includes(k))) || null
}

// Dyscyplina użytkownika dla typu aktywności; null gdy nie da się dopasować
// (użytkownik wybiera ręcznie w podglądzie importu).
export function mapDiscipline(type, disciplines) {
  const group = detectGroup(type)
  if (!group) return { group: null, discipline: null }
  const hit = disciplines.find((d) => {
    const id = normKey(d.ext_id)
    const name = normKey(d.name)
    return group.disc.some((k) => id.includes(k) || name.includes(k))
  })
  return { group, discipline: hit ? hit.ext_id : null }
}

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Walidacja jednej aktywności z wejścia (JSON od klienta lub skryptu).
export function normalizeActivity(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'aktywność musi być obiektem' }
  const external_id = sanitizeText(raw.external_id).trim().slice(0, 200)
  if (!external_id) return { error: 'brak external_id' }
  const m = LOCAL_RE.exec(sanitizeText(raw.started_at_local).trim())
  if (!m) return { error: 'started_at_local musi mieć format YYYY-MM-DDTHH:MM[:SS]' }
  const local = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}`
  if (Number.isNaN(Date.parse(local + 'Z'))) return { error: 'nieprawidłowa data started_at_local' }
  let started_at = null
  if (raw.started_at) {
    const t = Date.parse(sanitizeText(raw.started_at))
    if (Number.isNaN(t)) return { error: 'nieprawidłowa data started_at' }
    started_at = new Date(t).toISOString()
  }
  const source = sanitizeText(raw.source).trim() || 'garmin'
  if (!SOURCE_RE.test(source)) return { error: 'nieprawidłowe source' }
  return {
    act: {
      external_id,
      source,
      started_at_local: local,
      started_at,
      type: sanitizeText(raw.type).trim().slice(0, 100),
      title: sanitizeText(raw.title).trim().slice(0, 255),
      duration_s: num(raw.duration_s),
      distance_m: num(raw.distance_m),
      avg_hr: num(raw.avg_hr),
      max_hr: num(raw.max_hr),
      calories: num(raw.calories),
      discipline: raw.discipline ? sanitizeText(raw.discipline).trim().slice(0, 50) : null,
    },
  }
}

// Poniedziałek i klucz dnia dla lokalnej daty aktywności — arytmetyka w UTC,
// żeby zmiana czasu nie przesuwała dnia.
function weekOf(localIso) {
  const [y, mo, d] = localIso.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  const idx = (dt.getUTCDay() + 6) % 7
  const monday = new Date(dt.getTime() - idx * 86400000)
  return { week_start: monday.toISOString().slice(0, 10), day: DAY_KEYS[idx], date: localIso.slice(0, 10) }
}

const fmtPace = (secPerKm) => {
  const total = Math.round(secPerKm)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Parametry wykonania w formacie {key,value,unit} używanym w całej aplikacji.
export function buildParams(act, group) {
  const p = []
  if (act.distance_m > 0) {
    if (group?.distUnit === 'm') p.push({ key: 'Dystans', value: String(Math.round(act.distance_m)), unit: 'm' })
    else p.push({ key: 'Dystans', value: (act.distance_m / 1000).toFixed(2), unit: 'km' })
  }
  if (act.duration_s > 0) p.push({ key: 'Czas', value: String(Math.round(act.duration_s / 60)), unit: 'min' })
  if (group?.pace && act.distance_m > 0 && act.duration_s > 0) {
    p.push({ key: 'Tempo', value: fmtPace(act.duration_s / (act.distance_m / 1000)), unit: 'min/km' })
  }
  if (act.avg_hr > 0) p.push({ key: 'Śr. tętno', value: String(Math.round(act.avg_hr)), unit: 'bpm' })
  if (act.max_hr > 0) p.push({ key: 'Maks. tętno', value: String(Math.round(act.max_hr)), unit: 'bpm' })
  if (act.calories > 0) p.push({ key: 'Kalorie', value: String(Math.round(act.calories)), unit: 'kcal' })
  return p
}

const SOURCE_LABEL = { 'garmin-fit': 'plik FIT', 'garmin-csv': 'eksport CSV', 'garmin-connect': 'Garmin Connect' }

let schemaReady
export function ensureActivitySchema(pool) {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
      ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS external_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_user_external
        ON workout_logs(user_id, external_id) WHERE external_id IS NOT NULL;
    `).catch((e) => { schemaReady = undefined; throw e })
  }
  return schemaReady
}

// Walidacja całego body żądania; zwraca { error } albo { activities, options }.
export function parseImportBody(body) {
  if (!body || typeof body !== 'object') return { error: 'Brak body' }
  if (!Array.isArray(body.activities)) return { error: 'Wymagane pole "activities" (tablica)' }
  if (!body.activities.length) return { error: 'Lista aktywności jest pusta' }
  if (body.activities.length > MAX_ACTIVITIES) return { error: `Maksymalnie ${MAX_ACTIVITIES} aktywności w jednym żądaniu` }
  const tz = TZ_RE.test(body.tz || '') ? body.tz : DEFAULT_TZ
  return {
    activities: body.activities,
    options: {
      dryRun: !!body.dry_run,
      tz,
      defaultDiscipline: body.default_discipline ? sanitizeText(body.default_discipline).trim() : null,
    },
  }
}

// Cały import w jednej transakcji: dry-run wykonuje identyczną ścieżkę i na
// końcu robi ROLLBACK, więc podgląd pokazuje dokładnie to, co zrobi import.
export async function importActivities(pool, userId, rawActivities, { dryRun = false, tz = DEFAULT_TZ, defaultDiscipline = null } = {}) {
  await ensureActivitySchema(pool)
  // Dyscypliny lądują w bazie dopiero po pierwszej edycji kategorii; do tego
  // czasu frontend pokazuje zestaw domyślny — mapujemy więc na ten sam zestaw.
  let { rows: disciplines } = await pool.query(
    'SELECT ext_id, name FROM disciplines WHERE user_id = $1 ORDER BY id', [userId]
  )
  if (!disciplines.length) disciplines = DEFAULT_DISCIPLINES.map((d) => ({ ext_id: d.id, name: d.name }))
  const known = new Set(disciplines.map((d) => d.ext_id))

  const results = []
  const seen = new Set()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < rawActivities.length; i++) {
      const { act, error } = normalizeActivity(rawActivities[i])
      if (error) { results.push({ index: i, status: 'invalid', reason: error }); continue }

      const base = { index: i, external_id: act.external_id, ...weekOf(act.started_at_local) }
      if (seen.has(act.external_id)) { results.push({ ...base, status: 'duplicate', reason: 'powtórzony w tym imporcie' }); continue }
      seen.add(act.external_id)

      const { group, discipline: auto } = mapDiscipline(act.type, disciplines)
      let discipline = act.discipline || auto || defaultDiscipline
      if (discipline && !known.has(discipline)) {
        results.push({ ...base, status: 'invalid', reason: `nieznana dyscyplina "${discipline}"` })
        continue
      }
      const info = { ...base, discipline, discipline_auto: auto, group: group?.key || null }

      // Instant zapisu: UTC z pliku/API, a bez niego czas lokalny w strefie
      // użytkownika. expr(i) buduje wyrażenie SQL od placeholdera $i.
      const ts = act.started_at
        ? { expr: (i) => `$${i}::timestamptz`, args: [act.started_at] }
        : { expr: (i) => `($${i}::timestamp AT TIME ZONE $${i + 1})`, args: [act.started_at_local, tz] }

      const extIdx = ts.args.length + 2
      const dup = await client.query(
        `SELECT id, external_id FROM workout_logs
         WHERE user_id = $1 AND (
           external_id = $${extIdx}
           OR (source <> 'manual' AND logged_at BETWEEN ${ts.expr(2)} - interval '${NEAR_DUPLICATE_MIN} minutes'
                                                    AND ${ts.expr(2)} + interval '${NEAR_DUPLICATE_MIN} minutes')
         )
         ORDER BY (external_id = $${extIdx}) DESC LIMIT 1`,
        [userId, ...ts.args, act.external_id]
      )
      if (dup.rows.length) {
        const same = dup.rows[0].external_id === act.external_id
        results.push({ ...info, status: 'duplicate', log_id: dup.rows[0].id,
          reason: same ? 'już zaimportowano' : 'wpis z tego samego czasu już istnieje' })
        continue
      }

      if (!discipline) {
        results.push({ ...info, status: 'skipped', reason: 'nie rozpoznano dyscypliny — wybierz ręcznie' })
        continue
      }

      const params = buildParams(act, group)
      const startTime = act.started_at_local.slice(11, 16)
      const discName = disciplines.find((d) => d.ext_id === discipline)?.name || discipline
      const title = act.title || discName

      // Dopasowanie do planu: ten sam tydzień, dzień i dyscyplina; najpierw
      // treningi jeszcze nie odhaczone.
      const planned = await client.query(
        `SELECT id, title, done FROM workouts
         WHERE user_id = $1 AND week_start = $2 AND day = $3 AND discipline = $4 AND COALESCE(rest, FALSE) = FALSE
         ORDER BY done ASC, id ASC LIMIT 1`,
        [userId, info.week_start, info.day, discipline]
      )

      let workout
      let status
      if (planned.rows.length) {
        workout = planned.rows[0]
        status = 'matched'
        if (!workout.done) await client.query('UPDATE workouts SET done = TRUE WHERE id = $1', [workout.id])
      } else {
        const ins = await client.query(
          `INSERT INTO workouts (user_id, discipline, day, week_start, title, notes, params, exercises, rest, done, start_time, recurrence)
           VALUES ($1,$2,$3,$4,$5,'',$6,'[]',FALSE,TRUE,$7,'null') RETURNING id, title`,
          [userId, discipline, info.day, info.week_start, title, JSON.stringify(params), startTime]
        )
        workout = ins.rows[0]
        status = 'created'
      }

      const note = `Import: ${SOURCE_LABEL[act.source] || act.source}${act.title ? ` · ${act.title}` : ''}`
      const n = ts.args.length + 3
      const log = await client.query(
        `INSERT INTO workout_logs (user_id, workout_id, logged_at, note, feeling, actual_params, actual_exercises, source, external_id)
         VALUES ($1, $2, ${ts.expr(3)}, $${n}, NULL, $${n + 1}, '[]', $${n + 2}, $${n + 3})
         RETURNING id`,
        [userId, workout.id, ...ts.args, note, JSON.stringify(params), act.source, act.external_id]
      )
      results.push({ ...info, status, workout: { id: workout.id, title: workout.title }, log_id: log.rows[0].id, params })
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }

  const summary = { matched: 0, created: 0, duplicate: 0, skipped: 0, invalid: 0 }
  for (const r of results) summary[r.status]++
  return { dry_run: dryRun, summary, results }
}
