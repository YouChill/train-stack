import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Save, Trash2, TrendingUp, X } from 'lucide-react'
import * as api from '../api.js'

const today = () => new Date().toISOString().slice(0, 10)

const calcVolume = (sets) => {
  if (!sets || !sets.length) return 0
  return sets.reduce((sum, s) => {
    const r = parseFloat(s.actual_reps) || 0
    const l = parseFloat(s.actual_load) || 0
    return sum + r * l
  }, 0)
}

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl', { day: 'numeric', month: 'short' })
}

function VolumeChart({ history }) {
  if (!history || history.length < 2) return null
  const entries = [...history].reverse().slice(-8)
  const volumes = entries.map((e) => calcVolume(e.sets))
  const maxV = Math.max(...volumes, 1)
  const W = 320, H = 80
  const PAD = { t: 8, r: 8, b: 24, l: 36 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const step = entries.length > 1 ? iW / (entries.length - 1) : iW
  const pts = volumes.map((v, i) => ({
    x: PAD.l + i * step,
    y: PAD.t + iH - (v / maxV) * iH,
    v, date: entries[i].logged_date,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x},${PAD.t + iH} L ${PAD.l},${PAD.t + iH} Z`
  return (
    <div className="tp-ex-chart-wrap">
      <div className="tp-ex-chart-title"><TrendingUp size={12} /> Wolumen (powt. × kg)</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="tp-ex-chart-svg">
        {[0, 0.5, 1].map((f) => {
          const y = PAD.t + iH * (1 - f)
          return (
            <g key={f}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#2a3348" strokeWidth="1" strokeDasharray="3,3" />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#4b5563">{Math.round(maxV * f)}</text>
            </g>
          )
        })}
        <path d={areaD} fill="url(#exGrad)" opacity="0.4" />
        <path d={pathD} fill="none" stroke="#b4f13a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#b4f13a" />
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="7.5" fill="#5b6478">{fmtDate(p.date)}</text>
          </g>
        ))}
        <defs>
          <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b4f13a" />
            <stop offset="100%" stopColor="#b4f13a" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function ExerciseModal({ workout, exercise, discs, onClose }) {
  const disc = discs.find((d) => d.id === workout.discipline) || discs[0]
  const plannedSets = parseInt(exercise.sets) || 1
  const plannedReps = exercise.reps || ''
  const plannedLoad = exercise.load || ''
  const loadUnit    = exercise.loadUnit || 'kg'

  const buildRows = (count = plannedSets) =>
    Array.from({ length: count }, (_, i) => ({
      set_num: i + 1, planned_reps: plannedReps, actual_reps: '',
      planned_load: plannedLoad, actual_load: '', load_unit: loadUnit,
    }))

  const [logDate,  setLogDate]  = useState(today())
  const [rows,     setRows]     = useState(buildRows())
  const [history,  setHistory]  = useState([])
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [histPage, setHistPage] = useState(0)

  useEffect(() => {
    api.exerciseLogs.forExercise(exercise.name)
      .then((data) => {
        setHistory(data)
        const todayLog = data.find((l) => l.logged_date === logDate)
        if (todayLog?.sets?.length) setRows(todayLog.sets)
      })
      .catch(() => {})
  }, [exercise.name])

  useEffect(() => {
    const existing = history.find((l) => l.logged_date === logDate)
    if (existing?.sets?.length) setRows(existing.sets)
    else setRows(buildRows())
    setSaved(false)
  }, [logDate, history])

  const setRow = (i, field, value) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: value } : r)))

  const addRow = () =>
    setRows((rs) => [...rs, {
      set_num: rs.length + 1, planned_reps: plannedReps, actual_reps: '',
      planned_load: plannedLoad, actual_load: '', load_unit: loadUnit,
    }])

  const removeRow = (i) =>
    setRows((rs) => rs.filter((_, j) => j !== i).map((r, j) => ({ ...r, set_num: j + 1 })))

  const save = async () => {
    setSaving(true)
    try {
      await api.exerciseLogs.save({ workout_id: workout.id, exercise_name: exercise.name, logged_date: logDate, sets: rows })
      setHistory((prev) => {
        const without = prev.filter((l) => l.logged_date !== logDate)
        return [{ logged_date: logDate, sets: rows }, ...without].sort((a, b) => b.logged_date.localeCompare(a.logged_date))
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('Błąd zapisu: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalVolume   = calcVolume(rows)
  const completedSets = rows.filter((r) => r.actual_reps !== '' || r.actual_load !== '').length
  const HIST_PAGE_SIZE = 3
  const histSlice  = history.slice(histPage * HIST_PAGE_SIZE, (histPage + 1) * HIST_PAGE_SIZE)
  const histPages  = Math.ceil(history.length / HIST_PAGE_SIZE)

  return (
    <div className="tp-ov tp-ex-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-ex-modal">
        <div className="tp-ex-hdr">
          <div className="tp-ex-hdr-left">
            <div className="tp-card-badge" style={{ background: disc.color + '22', color: disc.color }}>
              <span>{disc.icon}</span><span>{disc.name}</span>
            </div>
            <h2 className="tp-ex-name">{exercise.name}</h2>
            <div className="tp-ex-subtitle">
              {plannedSets} ser. · {plannedReps} powt.{plannedLoad ? ` · plan: ${plannedLoad} ${loadUnit}` : ''}
            </div>
          </div>
          <button className="tp-x" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="tp-ex-body">
          <div className="tp-ex-date-row">
            <label className="tp-lbl">Data treningu</label>
            <input type="date" className="tp-inp tp-ex-date-inp" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </div>

          <div className="tp-ex-sets-section">
            <div className="tp-ex-sets-hdr">
              <span className="tp-lbl" style={{ margin: 0 }}>Serie</span>
              {totalVolume > 0 && (
                <span className="tp-ex-vol-badge">
                  Vol: <strong>{totalVolume.toLocaleString('pl', { maximumFractionDigits: 1 })}</strong> {loadUnit}
                </span>
              )}
            </div>
            <div className="tp-ex-col-hdr">
              <span>#</span><span>Plan powt.</span><span>✓ Powt.</span><span>Plan {loadUnit}</span><span>✓ {loadUnit}</span><span />
            </div>
            <div className="tp-ex-rows">
              {rows.map((r, i) => (
                <div key={i} className={`tp-ex-row${r.actual_reps || r.actual_load ? ' filled' : ''}`}>
                  <span className="tp-ex-set-num">{r.set_num}</span>
                  <span className="tp-ex-plan-val">{r.planned_reps || '—'}</span>
                  <input className="tp-ex-inp" type="number" min="0" placeholder={r.planned_reps || '0'}
                    value={r.actual_reps} onChange={(e) => setRow(i, 'actual_reps', e.target.value)} />
                  <span className="tp-ex-plan-val">{r.planned_load || '—'}</span>
                  <input className="tp-ex-inp" type="number" min="0" step="0.5" placeholder={r.planned_load || '0'}
                    value={r.actual_load} onChange={(e) => setRow(i, 'actual_load', e.target.value)} />
                  <button className="tp-ex-del-row" onClick={() => removeRow(i)} title="Usuń serię" disabled={rows.length <= 1}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <button className="tp-ex-add-row" onClick={addRow}><Plus size={12} /> Dodaj serię</button>
          </div>

          {history.length >= 2 && <VolumeChart history={history} />}

          {history.length > 0 && (
            <div className="tp-ex-hist">
              <div className="tp-ex-hist-hdr">
                <span className="tp-lbl" style={{ margin: 0 }}>Historia</span>
                {histPages > 1 && (
                  <div className="tp-ex-hist-nav">
                    <button className="tp-hbtn-ic" onClick={() => setHistPage((p) => Math.max(0, p - 1))} disabled={histPage === 0}>
                      <ChevronLeft size={12} />
                    </button>
                    <span className="tp-ex-hist-pages">{histPage + 1}/{histPages}</span>
                    <button className="tp-hbtn-ic" onClick={() => setHistPage((p) => Math.min(histPages - 1, p + 1))} disabled={histPage >= histPages - 1}>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
              {histSlice.map((log, i) => {
                const vol = calcVolume(log.sets)
                const isToday = log.logged_date === logDate
                return (
                  <div key={i} className={`tp-ex-hist-entry${isToday ? ' is-today' : ''}`}>
                    <div className="tp-ex-hist-date">
                      {fmtDate(log.logged_date)}
                      {isToday && <span className="tp-ex-today-badge">dziś</span>}
                    </div>
                    <div className="tp-ex-hist-sets">
                      {(log.sets || []).map((s, j) => (
                        <span key={j} className="tp-chip tp-ex-hist-chip">
                          {s.actual_reps || s.planned_reps}×{s.actual_load || s.planned_load}{s.load_unit || loadUnit}
                        </span>
                      ))}
                    </div>
                    {vol > 0 && <div className="tp-ex-hist-vol">vol {vol.toLocaleString('pl', { maximumFractionDigits: 0 })} {loadUnit}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="tp-ex-footer">
          <div className="tp-ex-footer-info">
            {completedSets > 0 && <span className="tp-ex-completed">{completedSets}/{rows.length} serii</span>}
          </div>
          <div className="tp-ex-footer-actions">
            <button className="tp-btn tp-bg" onClick={onClose}>Zamknij</button>
            <button className={`tp-btn tp-bl${saved ? ' tp-btn-saved' : ''}`} onClick={save} disabled={saving}>
              {saving ? '…' : saved ? '✓ Zapisano' : <><Save size={13} /> Zapisz sesję</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
