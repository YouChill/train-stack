import { DAYS } from './constants.js'

export const uid = () => Math.random().toString(36).slice(2, 10)

// Monday (local midnight) of the week that is `off` weeks from the current week
export const getMonday = (off = 0) => {
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const mon = new Date(now)
  mon.setHours(0, 0, 0, 0)
  mon.setDate(now.getDate() + diff + off * 7)
  return mon
}

// "YYYY-MM-DD" of the Monday anchoring a given week offset — the absolute key
// we persist so a plan stays pinned to real calendar dates instead of drifting.
export const weekStartStr = (off = 0) => {
  const d = getMonday(off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Integer week offset (relative to the current week) for a stored week_start
export const offsetFromWeekStart = (weekStart) => {
  if (!weekStart) return 0
  const [y, m, d] = String(weekStart).slice(0, 10).split('-').map(Number)
  const target = new Date(y, m - 1, d)
  target.setHours(0, 0, 0, 0)
  const cur = getMonday(0)
  return Math.round((target - cur) / (7 * 24 * 60 * 60 * 1000))
}

export const getWeekDates = (off = 0) => {
  const mon = getMonday(off)
  return DAYS.map((d, i) => {
    const dt = new Date(mon)
    dt.setDate(mon.getDate() + i)
    return { ...d, date: dt }
  })
}

export const fmtDate = (d) =>
  `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`

export const isToday = (d) =>
  new Date().toDateString() === d.toDateString()

// Importowane plany (i wpisy agenta) mogły trafić do bazy w dowolnym kształcie:
// params jako obiekt zamiast tablicy, element bez "key", wartości będące
// obiektami, start_time liczbą. Komponenty zakładają ścisły format, więc każdy
// trening przechodzący z serwera lub importu do stanu sprowadzamy do niego tu —
// inaczej pojedynczy zepsuty wiersz wywala render całej aplikacji.
const asText = (v) => (v == null || typeof v === 'object' ? '' : String(v))

// Widok dnia dopasowuje treningi do slotów po godzinie z "HH:MM" — start_time
// w innym formacie nie crashuje, ale czyni wpis niewidocznym na osi czasu.
const asTime = (v) => {
  const t = asText(v).trim()
  return /^\d{1,2}:\d{2}$/.test(t) ? t : ''
}

export const normalizeWorkout = (w) => {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return null

  let params = w.params
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    params = Object.entries(params).map(([key, value]) => ({ key, value }))
  }
  params = (Array.isArray(params) ? params : [])
    .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
    .map((p) => ({ ...p, key: asText(p.key), value: asText(p.value), unit: asText(p.unit) }))

  const exercises = (Array.isArray(w.exercises) ? w.exercises : [])
    .map((ex) => (typeof ex === 'string' ? { name: ex } : ex))
    .filter((ex) => ex && typeof ex === 'object' && !Array.isArray(ex))
    .map((ex) => ({
      ...ex,
      name: asText(ex.name), sets: asText(ex.sets), reps: asText(ex.reps),
      load: asText(ex.load), loadUnit: asText(ex.loadUnit),
    }))

  return {
    ...w,
    title: asText(w.title),
    notes: asText(w.notes),
    start_time: asTime(w.start_time),
    params,
    exercises,
    rest: !!w.rest,
    done: !!w.done,
  }
}

// Polska odmiana rzeczownika po liczebniku, np. plural(5, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')
export const plural = (n, one, few, many) => {
  if (n === 1) return one
  const d = n % 10
  const h = n % 100
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}
