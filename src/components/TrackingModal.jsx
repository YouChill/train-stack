import { useState, useEffect } from 'react'
import { Check, Clock, Minus, Plus, Save, X } from 'lucide-react'
import { UNITS, LOAD_UNITS } from '../constants.js'
import * as api from '../api.js'

const FEELINGS = [
  { v: 1, label: 'Fatalnie', icon: '😫' },
  { v: 2, label: 'Ciężko',   icon: '😓' },
  { v: 3, label: 'OK',       icon: '😐' },
  { v: 4, label: 'Dobrze',   icon: '💪' },
  { v: 5, label: 'Świetnie', icon: '🔥' },
]

export default function TrackingModal({ workout, discs, user, onSave, onClose }) {
  const disc = discs.find((d) => d.id === workout.discipline) || discs[0]
  const planned = workout.exercises || []
  const plannedParams = workout.params || []

  const [feeling, setFeeling] = useState(3)
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [actParams, setActParams] = useState(() =>
    plannedParams.map((p) => ({ ...p, actual: p.value }))
  )

  const [actExs, setActExs] = useState(() =>
    planned.map((e) => ({
      name: e.name,
      planned_sets: e.sets,
      planned_reps: e.reps,
      planned_load: e.load,
      loadUnit: e.loadUnit || 'kg',
      actual_sets: e.sets,
      actual_reps: e.reps,
      actual_load: e.load,
    }))
  )

  useEffect(() => {
    if (user && workout.id) {
      api.logs.forWorkout(workout.id)
        .then(setHistory)
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user, workout.id])

  const setAP = (i, v) => setActParams((ps) => ps.map((p, j) => (j === i ? { ...p, actual: v } : p)))
  const setAE = (i, f, v) => setActExs((es) => es.map((e, j) => (j === i ? { ...e, [f]: v } : e)))

  const save = async () => {
    const log = {
      workout_id: workout.id,
      feeling,
      note,
      actual_params: actParams.map((p) => ({ key: p.key, value: p.actual, unit: p.unit })),
      actual_exercises: actExs.map((e) => ({
        name: e.name,
        sets: e.actual_sets,
        reps: e.actual_reps,
        load: e.actual_load,
        loadUnit: e.loadUnit,
      })),
    }
    onSave(log)
  }

  const lastLog = history[0]

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">📝 Zapisz wyniki</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Workout info */}
          <div className="tp-track-info">
            <div className="tp-card-badge" style={{ background: disc.color + '22', color: disc.color }}>
              <span>{disc.icon}</span> <span>{disc.name}</span>
            </div>
            <span className="tp-track-title">{workout.title || disc.name}</span>
            {workout.start_time && <span className="tp-card-time"><Clock size={9} /> {workout.start_time}</span>}
          </div>

          {/* Feeling */}
          <div className="tp-f">
            <label className="tp-lbl">Samopoczucie</label>
            <div className="tp-feelings">
              {FEELINGS.map((f) => (
                <button
                  key={f.v}
                  className={`tp-feel${feeling === f.v ? ' sel' : ''}`}
                  onClick={() => setFeeling(f.v)}
                >
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span className="tp-feel-lbl">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actual params */}
          {actParams.length > 0 && (
            <div className="tp-sec">
              <div className="tp-sec-t">📊 Rzeczywiste parametry</div>
              <div className="tp-track-hdr">
                <span>Parametr</span><span>Plan</span><span>Rzeczywiste</span><span>Jedn.</span>
              </div>
              {actParams.map((p, i) => (
                <div key={i} className="tp-track-row">
                  <span className="tp-track-label">{p.key}</span>
                  <span className="tp-track-plan">{p.value || '—'}</span>
                  <input
                    className="tp-sm"
                    value={p.actual}
                    onChange={(e) => setAP(i, e.target.value)}
                    placeholder={p.value}
                  />
                  <span className="tp-track-unit">{p.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actual exercises */}
          {actExs.length > 0 && (
            <div className="tp-sec">
              <div className="tp-sec-t">💪 Rzeczywiste ćwiczenia</div>
              {actExs.map((ex, i) => (
                <div key={i} className="tp-track-ex">
                  <div className="tp-track-ex-name">{ex.name}</div>
                  <div className="tp-track-ex-grid">
                    <div className="tp-track-col">
                      <span className="tp-track-col-lbl">Serie</span>
                      <span className="tp-track-col-plan">{ex.planned_sets}</span>
                      <input className="tp-sm" value={ex.actual_sets}
                        onChange={(e) => setAE(i, 'actual_sets', e.target.value)} />
                    </div>
                    <div className="tp-track-col">
                      <span className="tp-track-col-lbl">Powt.</span>
                      <span className="tp-track-col-plan">{ex.planned_reps}</span>
                      <input className="tp-sm" value={ex.actual_reps}
                        onChange={(e) => setAE(i, 'actual_reps', e.target.value)} />
                    </div>
                    <div className="tp-track-col">
                      <span className="tp-track-col-lbl">Obciąż. ({ex.loadUnit})</span>
                      <span className="tp-track-col-plan">{ex.planned_load || '—'}</span>
                      <input className="tp-sm" value={ex.actual_load}
                        onChange={(e) => setAE(i, 'actual_load', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="tp-f">
            <label className="tp-lbl">Notatki z treningu</label>
            <textarea
              className="tp-ta"
              placeholder="Jak poszło? Co zmienić następnym razem?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Previous log */}
          {lastLog && (
            <div className="tp-sec" style={{ opacity: 0.7 }}>
              <div className="tp-sec-t">📜 Ostatni wpis ({new Date(lastLog.logged_at).toLocaleDateString('pl')})</div>
              <div style={{ fontSize: 11, color: '#505070' }}>
                Samopoczucie: {FEELINGS.find((f) => f.v === lastLog.feeling)?.icon || '—'}
                {lastLog.note && <span> — {lastLog.note}</span>}
              </div>
              {(lastLog.actual_exercises || []).length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {lastLog.actual_exercises.map((e, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#404060' }}>
                      {e.name}: {e.sets}×{e.reps} @ {e.load}{e.loadUnit}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            <button className="tp-btn tp-bl" onClick={save}>
              <Save size={13} /> Zapisz wyniki
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
