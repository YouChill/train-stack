import { Check, ClipboardList, Clock, Edit3, History, Repeat, Trash2 } from 'lucide-react'

export default function WorkoutCard({ w, discs, logCount, onEdit, onDelete, onToggle, onTrack, onViewLog, onExercise }) {
  const d = discs.find((x) => x.id === w.discipline) || discs[0]
  const filled = (w.params || []).filter((p) => p.value)
  const exercises = w.exercises || []
  const logged = logCount > 0

  if (w.rest) return <div className="tp-rest-card">🌙 Odpoczynek</div>

  return (
    <div className={`tp-card${w.done ? ' done' : ''}`} onClick={() => onEdit(w)}>
      <div className="tp-card-top">
        <div className="tp-card-badge" style={{ background: d.color + '22', color: d.color }}>
          <span>{d.icon}</span>
          <span>{d.name}</span>
        </div>
        <div className="tp-card-meta">
          {logged && <span className="tp-card-logged" title={`${logCount} wpisów`}>✓ {logCount}</span>}
          {w.recurrence && <Repeat size={9} className="tp-card-rec-ic" />}
          {w.start_time && (
            <span className="tp-card-time"><Clock size={9} /> {w.start_time}</span>
          )}
        </div>
      </div>
      <div className="tp-card-title">{w.title || d.name}</div>

      {filled.length > 0 && (
        <div className="tp-chips">
          {filled.map((p, i) => (
            <span key={i} className="tp-chip">{p.value} {p.unit}</span>
          ))}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="tp-ex-card-list" onClick={(e) => e.stopPropagation()}>
          {exercises.map((ex, i) => (
            <button
              key={i}
              className="tp-ex-card-item"
              onClick={() => onExercise && onExercise(w, ex)}
              title="Otwórz szczegóły ćwiczenia"
            >
              <span className="tp-ex-card-name">{ex.name}</span>
              <span className="tp-ex-card-detail">
                {ex.sets}×{ex.reps}
                {ex.load ? ` · ${ex.load}${ex.loadUnit || 'kg'}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {w.notes && (
        <div className="tp-card-note">
          {w.notes.slice(0, 55)}{w.notes.length > 55 ? '…' : ''}
        </div>
      )}

      <div className="tp-card-ft" onClick={(e) => e.stopPropagation()}>
        {logged && (
          <button className="tp-ca tr" onClick={() => onViewLog(w)} title="Dziennik treningu">
            <History size={14} />
          </button>
        )}
        <button className="tp-ca tr" onClick={() => onTrack(w)} title="Zapisz wyniki">
          <ClipboardList size={14} />
        </button>
        <button className="tp-ca dn" onClick={() => w.done ? onToggle(w.id) : onTrack(w)} title={w.done ? 'Odznacz' : 'Potwierdź wykonanie'}>
          <Check size={14} strokeWidth={w.done ? 3 : 1.5} />
        </button>
        <button className="tp-ca ed" onClick={() => onEdit(w)}>
          <Edit3 size={14} />
        </button>
        <button className="tp-ca dl" onClick={() => onDelete(w.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
