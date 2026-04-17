import { useMemo, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { isToday } from '../utils.js'
import WorkoutCard from './WorkoutCard.jsx'

export default function DayColumn({ day, workouts, discs, logCounts, onAdd, onEdit, onDelete, onToggle, onTrack, onViewLog }) {
  const today = isToday(day.date)
  const colRef = useRef(null)

  useEffect(() => {
    if (today && colRef.current) {
      colRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [today])

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
    <div className="tp-col" ref={colRef}>
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
            logCount={logCounts[w.id] || 0}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            onTrack={onTrack}
            onViewLog={onViewLog}
          />
        ))}
      </div>
    </div>
  )
}
