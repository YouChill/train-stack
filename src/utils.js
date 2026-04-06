import { DAYS } from './constants.js'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const getWeekDates = (off = 0) => {
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff + off * 7)
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
