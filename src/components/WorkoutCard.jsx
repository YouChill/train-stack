import { Check, Edit3, Trash2 } from 'lucide-react'

export default function WorkoutCard({ w, discs, onEdit, onDelete, onToggle }) {
  const d = discs.find((x) => x.id === w.discipline) || discs[0]
  const filled = (w.params || []).filter((p) => p.value)
  const exCnt = (w.exercises || []).length

  if (w.rest) return <div className="tp-rest-card">🌙 Odpoczynek</div>

  return (
    <div className={`tp-card${w.done ? ' done' : ''}`} onClick={() => onEdit(w)}>
      <div className="tp-card-badge" style={{ background: d.color + '22', color: d.color }}>
        <span>{d.icon}</span>
        <span>{d.name}</span>
      </div>
      <div className="tp-card-title">{w.title || d.name}</div>

      {filled.length > 0 && (
        <div className="tp-chips">
          {filled.map((p, i) => (
            <span key={i} className="tp-chip">{p.value} {p.unit}</span>
          ))}
        </div>
      )}

      {exCnt > 0 && (
        <div className="tp-ex-cnt">
          💪 {exCnt} ćwiczeni{exCnt === 1 ? 'e' : exCnt < 5 ? 'a' : ''}
        </div>
      )}

      {w.notes && (
        <div className="tp-card-note">
          {w.notes.slice(0, 55)}{w.notes.length > 55 ? '…' : ''}
        </div>
      )}

      <div className="tp-card-ft" onClick={(e) => e.stopPropagation()}>
        <button className="tp-ca dn" onClick={() => onToggle(w.id)} title={w.done ? 'Odznacz' : 'Ukończ'}>
          <Check size={12} strokeWidth={w.done ? 3 : 1.5} />
        </button>
        <button className="tp-ca ed" onClick={() => onEdit(w)}>
          <Edit3 size={12} />
        </button>
        <button className="tp-ca dl" onClick={() => onDelete(w.id)}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
