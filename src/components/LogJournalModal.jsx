import { useState, useEffect } from 'react'
import { Clock, Trash2, X } from 'lucide-react'
import * as api from '../api.js'

const FEELINGS = [
  { v: 1, icon: '😫', label: 'Fatalnie' },
  { v: 2, icon: '😓', label: 'Ciężko' },
  { v: 3, icon: '😐', label: 'OK' },
  { v: 4, icon: '💪', label: 'Dobrze' },
  { v: 5, icon: '🔥', label: 'Świetnie' },
]

export default function LogJournalModal({ workout, discs, onClose, onTrack }) {
  const disc = discs.find((d) => d.id === workout.discipline) || discs[0]
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (workout.id) {
      api.logs.forWorkout(workout.id)
        .then(setLogs)
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [workout.id])

  const deleteLog = async (logId) => {
    try {
      await api.logs.remove(logId)
      setLogs((prev) => prev.filter((l) => l.id !== logId))
    } catch (e) {
      alert('Błąd: ' + e.message)
    }
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">📒 Dziennik treningu</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-track-info">
            <div className="tp-card-badge" style={{ background: disc.color + '22', color: disc.color }}>
              <span>{disc.icon}</span> <span>{disc.name}</span>
            </div>
            <span className="tp-track-title">{workout.title || disc.name}</span>
          </div>

          {/* Planned exercises summary */}
          {(workout.exercises || []).length > 0 && (
            <div className="tp-sec" style={{ marginBottom: 14 }}>
              <div className="tp-sec-t">📋 Plan</div>
              {workout.exercises.map((e, i) => (
                <div key={i} className="tp-journal-plan-row">
                  <span className="tp-journal-ex-name">{e.name}</span>
                  <span className="tp-journal-ex-detail">{e.sets}×{e.reps}{e.load ? ` @ ${e.load} ${e.loadUnit || 'kg'}` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {loading && <div className="tp-loading"><div className="tp-spinner" /><p>Ładuję dziennik...</p></div>}

          {!loading && logs.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '30px 0' }}>
              Brak wpisów w dzienniku
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div className="tp-journal-list">
              {logs.map((log) => {
                const feel = FEELINGS.find((f) => f.v === log.feeling)
                const date = new Date(log.logged_at)
                return (
                  <div key={log.id} className="tp-journal-entry">
                    <div className="tp-journal-header">
                      <div className="tp-journal-date">
                        {date.toLocaleDateString('pl', { weekday: 'short', day: 'numeric', month: 'short' })}
                        <span style={{ opacity: 0.6 }}> {date.toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="tp-journal-meta">
                        {feel && <span title={feel.label}>{feel.icon}</span>}
                        <button className="tp-ca dl" onClick={() => deleteLog(log.id)} title="Usuń wpis">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Actual params */}
                    {(log.actual_params || []).length > 0 && (
                      <div className="tp-journal-params">
                        {log.actual_params.map((p, i) => (
                          <span key={i} className="tp-chip">{p.key}: {p.value} {p.unit}</span>
                        ))}
                      </div>
                    )}

                    {/* Actual exercises */}
                    {(log.actual_exercises || []).length > 0 && (
                      <div className="tp-journal-exercises">
                        {log.actual_exercises.map((e, i) => (
                          <div key={i} className="tp-journal-ex-row">
                            <span className="tp-journal-ex-name">{e.name}</span>
                            <span className="tp-journal-ex-detail">
                              {e.sets}×{e.reps}
                              {e.load ? ` @ ${e.load} ${e.loadUnit || 'kg'}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {log.note && <div className="tp-journal-note">{log.note}</div>}
                  </div>
                )
              })}
            </div>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Zamknij</button>
            <button className="tp-btn tp-bl" onClick={() => { onClose(); onTrack(workout) }}>
              + Nowy wpis
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
