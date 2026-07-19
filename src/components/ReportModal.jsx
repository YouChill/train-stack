import { useState, useEffect, useRef } from 'react'
import { Copy, Download, FileSpreadsheet, Share2, X } from 'lucide-react'
import * as api from '../api.js'
import { toast } from './Toasts.jsx'
import { buildReportText, buildSessionsCsv } from '../report-text.js'
import { plural } from '../utils.js'

const FEELINGS = ['', '😫', '😓', '😐', '💪', '🔥']
const PRESETS = [
  { key: '7', label: '7 dni', days: 7 },
  { key: '14', label: '14 dni', days: 14 },
  { key: '30', label: '30 dni', days: 30 },
  { key: 'custom', label: 'Własny' },
]

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const lastNDays = (n) => {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (n - 1))
  return { from: toISO(from), to: toISO(to) }
}

const fmtNum = (n) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(n)

// Delta KPI vs poprzedni okres — bez bazy porównawczej nic nie pokazujemy
function Delta({ cur, prev }) {
  if (!prev || prev <= 0) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return null
  return <div className={`tp-stat-delta ${pct > 0 ? 'up' : 'down'}`}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%</div>
}

export default function ReportModal({ discs, onClose }) {
  const [preset, setPreset] = useState('7')
  const [range, setRange] = useState(() => lastNDays(7))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expMenu, setExpMenu] = useState(false)
  const expRef = useRef(null)

  // Raport pojedynczego ćwiczenia: lista nazw + dane wybranego w okresie
  const [exNames, setExNames] = useState([])
  const [selEx, setSelEx] = useState('')
  const [exData, setExData] = useState(null)
  const [exLoading, setExLoading] = useState(false)

  useEffect(() => {
    api.exerciseLogs.names().then(setExNames).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selEx) { setExData(null); return }
    if (!range.from || !range.to || range.from > range.to) return
    setExLoading(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    api.report.get({ ...range, tz, exercise: selEx })
      .then((r) => setExData(r.exercise))
      .catch((e) => { toast('Błąd raportu ćwiczenia: ' + e.message); setExData(null) })
      .finally(() => setExLoading(false))
  }, [range, selEx])

  useEffect(() => {
    if (!expMenu) return
    const close = (e) => { if (!expRef.current?.contains(e.target)) setExpMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [expMenu])

  const pickPreset = (p) => {
    setPreset(p.key)
    if (p.days) setRange(lastNDays(p.days))
  }

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return
    setLoading(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    api.report.get({ ...range, tz })
      .then(setData)
      .catch((e) => { toast('Błąd raportu: ' + e.message); setData(null) })
      .finally(() => setLoading(false))
  }, [range])

  const disc = (id) => discs.find((d) => d.id === id) || { icon: '🏅', name: id, color: '#606080' }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText(data, discs, exData))
      toast('Raport skopiowany do schowka', 'success')
    } catch {
      toast('Nie udało się skopiować do schowka')
    }
  }

  const download = (name, text, mime) => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadMd = () =>
    download(`raport-${range.from}_${range.to}.md`, buildReportText(data, discs, exData), 'text/markdown;charset=utf-8')

  const downloadCsv = () =>
    download(`treningi-${range.from}_${range.to}.csv`, buildSessionsCsv(data, discs), 'text/csv;charset=utf-8')

  // Na telefonie najnaturalniejszy jest systemowy arkusz udostępniania
  const share = async () => {
    try {
      await navigator.share({ title: 'Raport treningowy', text: buildReportText(data, discs, exData) })
    } catch { /* anulowane przez użytkownika */ }
  }

  const pickExp = (fn) => () => { setExpMenu(false); fn() }

  const empty = data && data.kpi.sessions === 0

  // Pełna oś dni okresu (dni bez treningu = 0), max 31 słupków czytelnie.
  // Etykiety zawsze jednoliniowe (miesiąc tylko przy ≤8 słupkach) — dłuższa,
  // zawinięta etykieta podnosiła całą kolumnę i słupki traciły wspólną bazę.
  const dayBars = () => {
    const counts = Object.fromEntries(data.perDay.map((d) => [d.date, d.count]))
    const [y, m, dd] = range.from.split('-').map(Number)
    const bars = []
    for (let i = 0; i < data.period.days; i++) {
      const dt = new Date(y, m - 1, dd + i)
      const iso = toISO(dt)
      bars.push({ iso, dt, count: counts[iso] || 0 })
    }
    const max = Math.max(1, ...bars.map((b) => b.count))
    const dense = bars.length > 16
    const withMonth = bars.length <= 8
    const labelEvery = dense ? Math.ceil(bars.length / 6) : 1
    return (
      <div className={`tp-stat-weeks${dense ? ' dense' : ''}`}>
        {bars.map((b, i) => (
          <div key={b.iso} className="tp-stat-week">
            <div className="tp-stat-week-bar" style={{ height: (b.count / max) * 60, opacity: b.count ? 1 : 0.25 }} />
            {!dense && <div className="tp-stat-week-cnt">{b.count || ''}</div>}
            <div className="tp-stat-week-lbl">
              {i % labelEvery === 0
                ? (withMonth
                    ? b.dt.toLocaleDateString('pl', { day: 'numeric', month: 'short' })
                    : b.dt.getDate())
                : ''}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Wykres wybranego ćwiczenia: słupek = suma powtórzeń dnia, punkt = max kg.
  // Oś pokazuje tylko dni z seriami (progres siłowy, nie frekwencja).
  const exChart = () => {
    const rows = exData.perDay
    const maxReps = Math.max(1, ...rows.map((r) => r.reps))
    const maxLoad = Math.max(0, ...rows.map((r) => r.max_load || 0))
    const withMonth = rows.length <= 8
    const labelEvery = rows.length > 16 ? Math.ceil(rows.length / 6) : 1
    return (
      <>
        <div className="tp-exch-sum">
          {exData.bestLoad != null && <span>best <b>{fmtNum(exData.bestLoad)} kg</b></span>}
          {exData.totalReps > 0 && <span><b>{fmtNum(exData.totalReps)}</b> powt.</span>}
          {exData.volumeKg > 0 && <span>tonaż <b>{fmtNum(exData.volumeKg)} kg</b></span>}
          <span>{exData.days} {plural(exData.days, 'dzień', 'dni', 'dni')}</span>
        </div>
        <div className="tp-exch-legend">
          <span><i className="tp-exch-leg-bar" /> powtórzenia</span>
          {maxLoad > 0 && <span><i className="tp-exch-leg-dot" /> max kg</span>}
        </div>
        <div className={`tp-stat-weeks${rows.length > 16 ? ' dense' : ''}`} style={{ height: 'auto' }}>
          {rows.map((r, i) => {
            const [yy, mm, dd] = r.date.split('-').map(Number)
            const dt = new Date(yy, mm - 1, dd)
            return (
              <div key={r.date} className="tp-stat-week">
                <div className="tp-exch-track">
                  <div className="tp-exch-bar" style={{ height: `${(r.reps / maxReps) * 100}%` }} />
                  {r.max_load > 0 && (
                    <div className="tp-exch-dot" title={`${fmtNum(r.max_load)} kg`}
                      style={{ bottom: `${(r.max_load / maxLoad) * 100}%` }} />
                  )}
                </div>
                <div className="tp-stat-week-cnt">{r.reps ? fmtNum(r.reps) : ''}</div>
                <div className="tp-stat-week-lbl">
                  {i % labelEvery === 0
                    ? (withMonth
                        ? dt.toLocaleDateString('pl', { day: 'numeric', month: 'short' })
                        : dt.getDate())
                    : ''}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">Raport treningowy</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-rep-presets">
            {PRESETS.map((p) => (
              <button key={p.key} className={`tp-rep-preset${preset === p.key ? ' active' : ''}`}
                onClick={() => pickPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="tp-rep-dates">
              <input type="date" className="tp-inp" value={range.from} max={range.to}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>–</span>
              <input type="date" className="tp-inp" value={range.to} min={range.from}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </div>
          )}

          {loading && <div className="tp-loading"><div className="tp-spinner" /><p>Buduję raport...</p></div>}

          {!loading && empty && (
            <div style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 28, fontSize: 13 }}>
              Brak zapisanych treningów w tym okresie.<br />
              Zapisz trening przyciskiem „Track", a pojawi się w raporcie.
            </div>
          )}

          {!loading && data && !empty && (
            <>
              <div className="tp-stats-cards">
                <div className="tp-stat-card">
                  <div className="tp-stat-val">{data.kpi.sessions}</div>
                  <div className="tp-stat-lbl">{plural(data.kpi.sessions, 'Sesja', 'Sesje', 'Sesji')}</div>
                  <Delta cur={data.kpi.sessions} prev={data.prev.sessions} />
                </div>
                <div className="tp-stat-card">
                  <div className="tp-stat-val">
                    {data.kpi.adherencePct !== null ? `${data.kpi.adherencePct}%` : '—'}
                  </div>
                  <div className="tp-stat-lbl">
                    {data.kpi.planned > 0 ? `Plan ${data.kpi.done}/${data.kpi.planned}` : 'Brak planu'}
                  </div>
                </div>
                <div className="tp-stat-card">
                  <div className="tp-stat-val">
                    {data.kpi.avgFeeling ? FEELINGS[Math.round(data.kpi.avgFeeling)] : '—'}
                  </div>
                  <div className="tp-stat-lbl">Samopoczucie</div>
                </div>
              </div>

              {data.kpi.volumeKg > 0 && (
                <div className="tp-stat-card" style={{ marginBottom: 14 }}>
                  <div className="tp-stat-val">{fmtNum(data.kpi.volumeKg)} kg</div>
                  <div className="tp-stat-lbl">Tonaż (serie w kg)</div>
                  <Delta cur={data.kpi.volumeKg} prev={data.prev.volumeKg} />
                </div>
              )}

              <div className="tp-sec">
                <div className="tp-sec-t">Sesje per dzień</div>
                {dayBars()}
              </div>

              {data.byDiscipline.length > 0 && (
                <div className="tp-sec">
                  <div className="tp-sec-t">Dyscypliny</div>
                  {data.byDiscipline.map((d, i) => {
                    const di = disc(d.discipline)
                    const maxCount = Math.max(...data.byDiscipline.map((x) => x.count))
                    return (
                      <div key={i} className="tp-stat-disc">
                        <span className="tp-stat-disc-icon">{di.icon}</span>
                        <span className="tp-stat-disc-name">{di.name}</span>
                        <div className="tp-stat-bar-wrap">
                          <div className="tp-stat-bar" style={{ width: `${(d.count / maxCount) * 100}%`, background: di.color }} />
                        </div>
                        <span className="tp-stat-disc-cnt">{d.count}×</span>
                        <span>{d.avg_feeling ? FEELINGS[Math.round(d.avg_feeling)] : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {data.topExercises.length > 0 && (
                <div className="tp-sec">
                  <div className="tp-sec-t">Top ćwiczenia</div>
                  {data.topExercises.map((e, i) => {
                    const trend = e.first_max && e.last_max && e.first_max !== e.last_max
                      ? { up: e.last_max > e.first_max, txt: `${fmtNum(e.first_max)}→${fmtNum(e.last_max)} kg` }
                      : null
                    return (
                      <div key={i} className="tp-rep-ex">
                        <span className="tp-rep-ex-name">{e.name}</span>
                        <span className="tp-rep-ex-meta">
                          {e.days} {plural(e.days, 'dzień', 'dni', 'dni')}
                          {e.best_load ? ` · best ${fmtNum(e.best_load)} kg` : ''}
                        </span>
                        {trend && (
                          <span className={`tp-rep-ex-trend ${trend.up ? 'up' : 'down'}`}>
                            {trend.up ? '▲' : '▼'} {trend.txt}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {data.notes.length > 0 && (
                <div className="tp-sec">
                  <div className="tp-sec-t">Notatki</div>
                  {data.notes.map((n, i) => {
                    const di = disc(n.discipline)
                    return (
                      <div key={i} className="tp-log-item">
                        <div className="tp-log-top">
                          <span style={{ fontSize: 14 }}>{di.icon}</span>
                          <span className="tp-log-title">{n.title || di.name}</span>
                          <span className="tp-log-feel">{FEELINGS[n.feeling] || ''}</span>
                          <span className="tp-log-date">
                            {new Date(n.date).toLocaleDateString('pl', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="tp-card-note" style={{ marginTop: 4 }}>{n.note}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Poza blokiem !empty — serie ćwiczeń mogą istnieć bez zapisanych sesji */}
          {!loading && data && exNames.length > 0 && (
            <div className="tp-sec">
              <div className="tp-sec-t">Raport ćwiczenia</div>
              <select className="tp-sel" value={selEx} style={{ marginBottom: 10 }}
                onChange={(e) => setSelEx(e.target.value)}>
                <option value="">— wybierz ćwiczenie —</option>
                {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {exLoading && <div className="tp-loading" style={{ padding: '14px 0' }}><div className="tp-spinner" /></div>}
              {!exLoading && exData && exData.perDay.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 12, fontSize: 12 }}>
                  Brak serii tego ćwiczenia w wybranym okresie.
                </div>
              )}
              {!exLoading && exData && exData.perDay.length > 0 && exChart()}
            </div>
          )}

          <div className="tp-mf">
            {!loading && data && !empty && (
              <div className="tp-exp-wrap" ref={expRef}>
                <button className="tp-btn tp-bp" onClick={() => setExpMenu((m) => !m)}>
                  <Share2 size={12} /> Eksport
                </button>
                {expMenu && (
                  <div className="tp-exp-menu">
                    {typeof navigator.share === 'function' && (
                      <button className="tp-menu-it" onClick={pickExp(share)}><Share2 size={13} /> Udostępnij…</button>
                    )}
                    <button className="tp-menu-it" onClick={pickExp(copy)}><Copy size={13} /> Kopiuj tekst</button>
                    <button className="tp-menu-it" onClick={pickExp(downloadMd)}><Download size={13} /> Pobierz .md</button>
                    <button className="tp-menu-it" onClick={pickExp(downloadCsv)}><FileSpreadsheet size={13} /> Pobierz CSV</button>
                  </div>
                )}
              </div>
            )}
            <button className="tp-btn tp-bg" onClick={onClose}>Zamknij</button>
          </div>
        </div>
      </div>
    </div>
  )
}
