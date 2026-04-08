import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { isToday } from '../utils.js'
import WorkoutCard from './WorkoutCard.jsx'

export default function DayColumn({ day, workouts, discs, onAdd, onEdit, onDelete, onToggle, onTrack }) {
  const today = isToday(day.date)

  const sorted = useMemo(() =>
    [...workouts].sort((a, b) => {
      const ta = a.start_time || ''
      const tb = b.start_time || ''
      if (!ta && !tb) return 0
      if (!ta) return 1
      if (!tb) return -1
      return ta.localeCompare(tb)
    }),
    [workouts]
  )

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
        {sorted.map((w) => (
          <WorkoutCard
            key={w.id}
            w={w}
            discs={discs}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            onTrack={onTrack}
          />
        ))}
      </div>
    </div>
  )
}
