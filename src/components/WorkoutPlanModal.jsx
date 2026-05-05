import { ChevronRight, Clock, ClipboardList, Edit3, X } from 'lucide-react'

export default function WorkoutPlanModal({ workout, discs, onClose, onEdit, onTrack, onExercise }) {
  const disc     = discs.find((d) => d.id === workout.discipline) || discs[0]
  const params   = (workout.params   || []).filter((p) => p.value)
  const exercises = workout.exercises || []

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">

          {/* Header */}
          <div className="tp-mh">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <div className="tp-card-badge" style={{ background: disc.color + '22', color: disc.color, width: 'fit-content' }}>
                <span>{disc.icon}</span><span>{disc.name}</span>
              </div>
              <div className="tp-mt">{workout.title || disc.name}</div>
              {workout.start_time && (
                <span className="tp-card-time" style={{ fontSize: 12 }}>
                  <Clock size={11} /> {workout.start_time}
                </span>
              )}
            </div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Params */}
          {params.length > 0 && (
            <div className="tp-chips" style={{ marginBottom: 14 }}>
              {params.map((p, i) => (
                <span key={i} className="tp-chip">{p.key}: {p.value} {p.unit}</span>
              ))}
            </div>
          )}

          {/* Exercise list */}
          {exercises.length > 0 && (
            <div className="tp-sec">
              <div className="tp-sec-t">💪 Ćwiczenia</div>
              <div className="tp-plan-ex-list">
                {exercises.map((ex, i) => (
                  <button
                    key={i}
                    className="tp-plan-ex-row"
                    onClick={() => onExercise(workout, ex)}
                  >
                    <div className="tp-plan-ex-left">
                      <span className="tp-plan-ex-name">{ex.name}</span>
                      <span className="tp-plan-ex-detail">
                        {ex.sets} serie · {ex.reps} powt.
                        {ex.load ? ` · ${ex.load} ${ex.loadUnit || 'kg'}` : ''}
                      </span>
                    </div>
                    <ChevronRight size={14} className="tp-plan-ex-arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {workout.notes && (
            <div className="tp-sec">
              <div className="tp-sec-t">📝 Notatki</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{workout.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Zamknij</button>
            <button className="tp-btn tp-bg" onClick={() => { onClose(); onEdit(workout) }}>
              <Edit3 size={13} /> Edytuj
            </button>
            <button className="tp-btn tp-bl" onClick={() => { onClose(); onTrack(workout) }}>
              <ClipboardList size={13} /> Zapisz wyniki
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
