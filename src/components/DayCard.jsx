import { Clock, ClipboardList, Check, Edit3, Trash2 } from 'lucide-react'

export default function DayCard({ w, discs, logCounts, onEdit, onDelete, onToggle, onTrack }) {
  if (w.rest) return null

  const disc = discs.find((x) => x.id === w.discipline) || discs[0]
  const filled = (w.params || []).filter((p) => p.value)
  const exercises = w.exercises || []
  const logged = (logCounts?.[w.id] || 0) > 0

  return (
    <div
      className={`tp-dv-card${w.done ? ' done' : ''}`}
      style={{ '--dc': disc.color }}
      onClick={onEdit}
    >
      <div className="tp-dv-card-top">
        {w.start_time && (
          <span className="tp-dv-card-time">
            <Clock size={11} /> {w.start_time}
          </span>
        )}
        <span className="tp-dv-card-title">{w.title || disc.name}</span>
        <span className="tp-dv-card-disc" style={{ background: disc.color + '22', color: disc.color }}>
          {disc.icon} {disc.name}
        </span>
        {logged && (
          <span className="tp-card-logged">✓ {logCounts[w.id]}</span>
        )}
      </div>

      <div className="tp-dv-card-body">
        {filled.length > 0 && (
          <div className="tp-dv-card-col">
            <div className="tp-dv-card-col-lbl">Parametry</div>
            <div className="tp-chips">
              {filled.map((p, i) => (
                <span key={i} className="tp-chip">{p.key}: {p.value} {p.unit}</span>
              ))}
            </div>
          </div>
        )}
        {exercises.length > 0 && (
          <div className="tp-dv-card-col" onClick={(e) => e.stopPropagation()} style={{ flex: '1 1 100%' }}>
            <div className="tp-dv-card-col-lbl">Ćwiczenia · {exercises.length}</div>
            <div className="tp-dv-card-exlist">
              {exercises.map((ex, i) => (
                <div key={i} className="tp-dv-card-exrow">
                  <b>{ex.name}</b>
                  <span>{ex.sets}×{ex.reps}{ex.load ? ` · ${ex.load}${ex.loadUnit || 'kg'}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {w.notes && <div className="tp-dv-card-note">{w.notes}</div>}

      <div className="tp-dv-card-ft" onClick={(e) => e.stopPropagation()}>
        <button className="tp-ca tr" title="Zapisz wyniki" onClick={onTrack}>
          <ClipboardList size={14} />
        </button>
        <button className="tp-ca dn" title={w.done ? 'Odznacz' : 'Potwierdź'} onClick={onToggle}>
          <Check size={14} strokeWidth={w.done ? 3 : 1.5} />
        </button>
        <button className="tp-ca ed" onClick={onEdit}>
          <Edit3 size={14} />
        </button>
        <button className="tp-ca dl" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
