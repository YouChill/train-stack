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

// Polska odmiana rzeczownika po liczebniku, np. plural(5, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')
export const plural = (n, one, few, many) => {
  if (n === 1) return one
  const d = n % 10
  const h = n % 100
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}
