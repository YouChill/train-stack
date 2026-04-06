import { Plus } from 'lucide-react'
import { isToday } from '../utils.js'
import WorkoutCard from './WorkoutCard.jsx'

export default function DayColumn({ day, workouts, discs, onAdd, onEdit, onDelete, onToggle }) {
  const today = isToday(day.date)

  return (
    <div className="tp-col">
      <div className={`tp-col-hd${today ? ' today' : ''}`}>
        <div className="tp-col-hd-top">
          <span className={`tp-day-s${today ? ' today' : ''}`}>{day.s}</span>
          <button className="tp-add-day" onClick={onAdd}>
            <Plus size={13} />
          </button>
        </div>
        <div className={`tp-day-n${today ? ' today' : ''}`}>{day.date.getDate()}</div>
      </div>

      <div className="tp-col-body">
        {workouts.map((w) => (
          <WorkoutCard
            key={w.id}
            w={w}
            discs={discs}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
