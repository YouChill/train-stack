// Parsowanie plików z Garmin Connect po stronie przeglądarki do wspólnego
// formatu aktywności (docs/garmin.md), który przyjmuje POST /api/activities.
// Obsługiwane: FIT ("Eksportuj oryginał" — zwykle w archiwum ZIP) oraz CSV
// z listy aktywności ("Eksportuj CSV", nagłówki angielskie lub polskie).
// Funkcje przyjmują ArrayBuffer/string, więc działają też w Node (testy).

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31)

export function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

const pad = (n) => String(n).padStart(2, '0')
const localIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

// Pola czasu z SDK przychodzą jako Date (domyślne convertDateTimesToDates)
// albo jako sekundy od epoki FIT, gdy pole nie jest typem date_time.
const toDate = (v) => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(FIT_EPOCH_MS + v * 1000)
  return null
}

const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// ── FIT ─────────────────────────────────────────────────────────────────────
// SDK (ok. 1 MB profilu) ładowany dopiero przy pierwszym imporcie.
export async function parseFit(buffer, name = 'plik.fit') {
  const { Decoder, Stream } = await import('@garmin/fitsdk')
  const stream = Stream.fromArrayBuffer(buffer)
  if (!Decoder.isFIT(stream)) throw new Error(`${name}: to nie jest plik FIT`)
  const decoder = new Decoder(stream)
  const { messages } = decoder.read({ includeUnknownData: false, mergeHeartRates: false, decodeMemoGlobs: false })

  const sessions = messages.sessionMesgs || []
  if (!sessions.length) throw new Error(`${name}: brak podsumowania sesji — to nie jest plik aktywności`)

  const fileId = (messages.fileIdMesgs || [])[0] || {}
  const activity = (messages.activityMesgs || [])[0]
  // activity.localTimestamp to ten sam moment co activity.timestamp, ale
  // wyrażony w czasie lokalnym zegarka — różnica daje przesunięcie strefy.
  const local = toDate(activity?.localTimestamp)
  const utc = toDate(activity?.timestamp)
  const offsetMs = local && utc ? local.getTime() - utc.getTime() : null
  const sportName = (messages.sportMesgs || [])[0]?.name
  const serial = fileId.serialNumber ?? 0
  const created = toDate(fileId.timeCreated) || toDate(sessions[0].startTime) || toDate(sessions[0].timestamp)
  if (!created) throw new Error(`${name}: brak daty w pliku`)

  return sessions.map((s, i) => {
    const start = toDate(s.startTime) || toDate(s.timestamp)
    if (!start) return null
    const title = [s.sportProfileName, sportName].find((v) => typeof v === 'string' && v.trim()) || ''
    return {
      external_id: `fit:${serial}:${Math.floor(created.getTime() / 1000)}${sessions.length > 1 ? `:${i}` : ''}`,
      source: 'garmin-fit',
      started_at: start.toISOString(),
      started_at_local: offsetMs == null
        ? localIso(start)
        : new Date(start.getTime() + offsetMs).toISOString().slice(0, 19),
      type: [s.sport, s.subSport].filter((v) => v != null && v !== 'generic').map(String).join('/') || 'generic',
      title: title.trim(),
      duration_s: numOrNull(s.totalTimerTime) ?? numOrNull(s.totalElapsedTime),
      distance_m: numOrNull(s.totalDistance),
      avg_hr: numOrNull(s.avgHeartRate),
      max_hr: numOrNull(s.maxHeartRate),
      calories: numOrNull(s.totalCalories),
      file: name,
    }
  }).filter(Boolean)
}

// ── ZIP ─────────────────────────────────────────────────────────────────────
// Minimalny czytnik ZIP (stored + deflate) — "Eksportuj oryginał" w Garmin
// Connect zwraca archiwum z jednym plikiem FIT, a użytkownik nie powinien
// musieć go rozpakowywać. Deflate przez natywny DecompressionStream.
export async function unzip(buffer) {
  const dv = new DataView(buffer)
  const u8 = new Uint8Array(buffer)
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('uszkodzone archiwum ZIP')
  const count = dv.getUint16(eocd + 10, true)
  let off = dv.getUint32(eocd + 16, true)
  const out = []
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(off, true) !== 0x02014b50) throw new Error('uszkodzone archiwum ZIP')
    const method = dv.getUint16(off + 10, true)
    const csize = dv.getUint32(off + 20, true)
    const nlen = dv.getUint16(off + 28, true)
    const elen = dv.getUint16(off + 30, true)
    const clen = dv.getUint16(off + 32, true)
    const lho = dv.getUint32(off + 42, true)
    const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nlen))
    off += 46 + nlen + elen + clen
    if (name.endsWith('/')) continue
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true)
    const raw = u8.slice(start, start + csize)
    let data
    if (method === 0) data = raw.buffer
    else if (method === 8) data = await inflateRaw(raw)
    else throw new Error(`nieobsługiwana metoda kompresji ZIP (${method})`)
    out.push({ name, data })
  }
  return out
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('przeglądarka nie obsługuje rozpakowywania ZIP — wgraj plik .fit')
  const ds = new DecompressionStream('deflate-raw')
  return new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer()
}

// ── CSV ─────────────────────────────────────────────────────────────────────
const CSV_COLUMNS = {
  type:     ['activitytype', 'typaktywnosci', 'typ', 'rodzajaktywnosci', 'sport'],
  date:     ['date', 'data', 'datarozpoczecia', 'starttime', 'czasrozpoczecia'],
  title:    ['title', 'tytul', 'nazwa', 'activityname', 'nazwaaktywnosci'],
  distance: ['distance', 'dystans', 'odleglosc'],
  calories: ['calories', 'kalorie', 'kcal'],
  time:     ['time', 'czas', 'duration', 'czastrwania'],
  avg_hr:   ['avghr', 'srtetno', 'avgheartrate', 'srednietetno', 'sredniett', 'sredniehr', 'avgheartrate'],
  max_hr:   ['maxhr', 'makstetno', 'maxheartrate', 'maksymalnetetno', 'makshr'],
}

function detectDelimiter(line) {
  const count = (ch) => (line.match(new RegExp(`\\${ch}`, 'g')) || []).length
  return count(';') > count(',') ? ';' : ','
}

// Prosty parser RFC 4180: cudzysłowy, podwojone cudzysłowy, CRLF.
export function parseCsvRows(text, delim = ',') {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const parseNum = (v) => {
  const t = String(v ?? '').replace(/[\s ]/g, '').replace(',', '.')
  if (!t || t === '--') return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

// "0:52:13", "52:13", "1:02:03.5" → sekundy
export const parseDuration = (v) => {
  const t = String(v ?? '').trim()
  if (!t || t === '--') return null
  const parts = t.split(':').map((p) => parseFloat(p.replace(',', '.')))
  if (parts.some((p) => !Number.isFinite(p))) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 60
}

// "2026-08-30 07:12:05" / "30.08.2026 07:12" / "2026-08-30" → "YYYY-MM-DDTHH:MM:SS"
export const parseLocalDate = (v) => {
  const t = String(v ?? '').trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(t)
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${pad(m[4] || 0)}:${m[5] || '00'}:${m[6] || '00'}`
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(t)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}T${pad(m[4] || 0)}:${m[5] || '00'}:${m[6] || '00'}`
  return null
}

export function parseCsv(text, name = 'plik.csv') {
  const clean = text.replace(/^\uFEFF/, '')
  const rows = parseCsvRows(clean, detectDelimiter(clean.split(/\r?\n/)[0] || ''))
  if (rows.length < 2) throw new Error(`${name}: pusty plik CSV`)
  const header = rows[0].map(normKey)
  const ci = Object.fromEntries(
    Object.entries(CSV_COLUMNS).map(([k, aliases]) => [k, header.findIndex((h) => aliases.includes(h))])
  )
  if (ci.type < 0 || ci.date < 0) {
    throw new Error(`${name}: nie rozpoznano nagłówków — oczekiwany eksport CSV listy aktywności z Garmin Connect`)
  }
  const cell = (r, i) => (i >= 0 ? r[i] : undefined)
  const out = []
  for (const r of rows.slice(1)) {
    if (!r.length || r.every((c) => !String(c).trim())) continue
    const date = parseLocalDate(cell(r, ci.date))
    if (!date) continue
    const type = String(cell(r, ci.type) || '').trim()
    const dist = parseNum(cell(r, ci.distance))
    // Garmin podaje dystans pływania w metrach, pozostałe w km.
    const swim = /swim|plyw|basen/.test(normKey(type))
    out.push({
      external_id: `gccsv:${date}:${normKey(type) || 'x'}`,
      source: 'garmin-csv',
      started_at_local: date,
      type,
      title: String(cell(r, ci.title) || '').trim(),
      duration_s: parseDuration(cell(r, ci.time)),
      distance_m: dist == null ? null : swim ? dist : dist * 1000,
      avg_hr: parseNum(cell(r, ci.avg_hr)),
      max_hr: parseNum(cell(r, ci.max_hr)),
      calories: parseNum(cell(r, ci.calories)),
      file: name,
    })
  }
  if (!out.length) throw new Error(`${name}: nie znaleziono żadnej aktywności`)
  return out
}

// ── Wejście z <input type="file"> ───────────────────────────────────────────
const ext = (name) => String(name || '').toLowerCase().split('.').pop()

async function parseOne(name, readBuffer, readText) {
  switch (ext(name)) {
    case 'fit': return parseFit(await readBuffer(), name)
    case 'csv': return parseCsv(await readText(), name)
    case 'zip': {
      const entries = await unzip(await readBuffer())
      const acts = []
      for (const e of entries) {
        if (ext(e.name) === 'fit') acts.push(...await parseFit(e.data, `${name}/${e.name}`))
        else if (ext(e.name) === 'csv') acts.push(...parseCsv(new TextDecoder().decode(e.data), `${name}/${e.name}`))
      }
      if (!acts.length) throw new Error(`${name}: archiwum nie zawiera plików FIT ani CSV`)
      return acts
    }
    default: throw new Error(`${name}: nieobsługiwany typ pliku (dozwolone: .fit, .zip, .csv)`)
  }
}

// Zwraca aktywności (bez duplikatów po external_id) i listę błędów per plik —
// jeden zepsuty plik nie blokuje importu pozostałych.
export async function parseFiles(files) {
  const activities = []
  const errors = []
  const seen = new Set()
  for (const f of files) {
    try {
      for (const a of await parseOne(f.name, () => f.arrayBuffer(), () => f.text())) {
        if (seen.has(a.external_id)) continue
        seen.add(a.external_id)
        activities.push(a)
      }
    } catch (e) {
      errors.push({ file: f.name, message: e.message || String(e) })
    }
  }
  return { activities, errors }
}
