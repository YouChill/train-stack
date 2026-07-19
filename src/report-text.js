import { plural } from './utils.js'

// Tekstowa (Markdown) wersja raportu — wspólna dla przycisku "Kopiuj"
// i przyszłego eksportu plikowego. Czysta funkcja, niezależna od Reacta.

const FEELINGS = ['', '😫', '😓', '😐', '💪', '🔥']

const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const fmtNum = (n) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(n)

const feelingTxt = (avg) => (avg ? `${FEELINGS[Math.round(avg)]} (${avg.toFixed(1)}/5)` : null)

// "+20%" / "-8%" vs poprzedni okres; null gdy brak bazy do porównania
const deltaTxt = (cur, prevVal) => {
  if (!prevVal || prevVal <= 0) return null
  const pct = Math.round(((cur - prevVal) / prevVal) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export function buildReportText(report, discs) {
  const disc = (id) => discs.find((d) => d.id === id) || { icon: '🏅', name: id }
  const { period, kpi, prev, byDiscipline, topExercises, notes } = report
  const L = []

  L.push(`# Raport treningowy ${fmtDate(period.from)} – ${fmtDate(period.to)}`)
  L.push('')

  const head = [
    `**${kpi.sessions} ${plural(kpi.sessions, 'sesja', 'sesje', 'sesji')}** w ${kpi.activeDays} ${plural(kpi.activeDays, 'dniu', 'dniach', 'dniach')}`,
  ]
  if (kpi.planned > 0) head.push(`realizacja planu ${kpi.adherencePct}% (${kpi.done}/${kpi.planned})`)
  if (kpi.volumeKg > 0) head.push(`tonaż ${fmtNum(kpi.volumeKg)} kg`)
  L.push(head.join(' · '))

  const feel = feelingTxt(kpi.avgFeeling)
  if (feel) L.push(`Samopoczucie: ${feel}`)

  const deltas = [
    ['sesje', deltaTxt(kpi.sessions, prev.sessions)],
    ['tonaż', deltaTxt(kpi.volumeKg, prev.volumeKg)],
  ].filter(([, d]) => d)
  if (deltas.length) L.push(`Vs poprzedni okres: ${deltas.map(([n, d]) => `${n} ${d}`).join(', ')}`)

  if (byDiscipline.length) {
    L.push('')
    L.push('## Dyscypliny')
    for (const d of byDiscipline) {
      const di = disc(d.discipline)
      const f = d.avg_feeling ? ` (śr. ${FEELINGS[Math.round(d.avg_feeling)]})` : ''
      L.push(`- ${di.icon} ${di.name} — ${d.count}×${f}`)
    }
  }

  if (topExercises.length) {
    L.push('')
    L.push('## Top ćwiczenia')
    for (const e of topExercises) {
      const bits = [`${e.days} ${plural(e.days, 'dzień', 'dni', 'dni')}`]
      if (e.best_load) bits.push(`best ${fmtNum(e.best_load)} kg`)
      if (e.volume_kg > 0) bits.push(`tonaż ${fmtNum(e.volume_kg)} kg`)
      if (e.first_max && e.last_max && e.first_max !== e.last_max) {
        bits.push(`progres ${fmtNum(e.first_max)}→${fmtNum(e.last_max)} kg ${e.last_max > e.first_max ? '▲' : '▼'}`)
      }
      L.push(`- ${e.name} — ${bits.join(', ')}`)
    }
  }

  if (notes.length) {
    L.push('')
    L.push('## Notatki')
    for (const n of notes) {
      const di = disc(n.discipline)
      const title = n.title || di.name
      L.push(`- ${fmtDate(n.date).slice(0, 5)} „${title}": ${n.note.trim().replace(/\s+/g, ' ')}`)
    }
  }

  return L.join('\n')
}
