import { Check, ClipboardList, Clock, Dumbbell, Edit3, History, Moon, Repeat } from 'lucide-react'
import ConfirmDelete from './ConfirmDelete.jsx'
import { plural } from '../utils.js'

export default function WorkoutCard({ w, discs, logCount, onView, onEdit, onDelete, onDeleteSeries, onToggle, onTrack, onViewLog }) {
  const d = discs.find((x) => x.id === w.discipline) || discs[0]
  const filled = (w.params || []).filter((p) => p.value)
  const exCnt = (w.exercises || []).length
  const logged = logCount > 0

  if (w.rest) return <div className="tp-rest-card"><Moon size={13} /> Odpoczynek</div>

  return (
    <div className={`tp-card${w.done ? ' done' : ''}`} style={{ '--dc': d.color }} onClick={() => onView(w)}>
      <div className="tp-card-top">
        <div className="tp-card-badge" style={{ background: d.color + '22', color: d.color }}>
          <span>{d.icon}</span>
          <span>{d.name}</span>
        </div>
        <div className="tp-card-meta">
          {logged && <span className="tp-card-logged" title={`${logCount} ${plural(logCount, 'wpis', 'wpisy', 'wpisów')}`}>✓ {logCount}</span>}
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

      {exCnt > 0 && (
        <div className="tp-ex-cnt">
          <Dumbbell size={12} /> {exCnt} {plural(exCnt, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}
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
        <button className="tp-ca dn" onClick={() => onToggle(w.id)} title={w.done ? 'Odznacz' : 'Oznacz jako wykonane'}>
          <Check size={14} strokeWidth={w.done ? 3 : 1.5} />
        </button>
        <button className="tp-ca ed" onClick={() => onEdit(w)} title="Edytuj">
          <Edit3 size={14} />
        </button>
        <ConfirmDelete
          onDelete={() => onDelete(w.id)}
          onDeleteSeries={w.recurrence && onDeleteSeries ? () => onDeleteSeries(w.id) : undefined}
        />
      </div>
    </div>
  )
}
