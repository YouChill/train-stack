import { useMemo, useRef, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { isToday } from '../utils.js'
import WorkoutCard, { DRAG_MIME } from './WorkoutCard.jsx'

export default function DayColumn({ day, workouts, discs, logCounts, onAdd, onView, onEdit, onDelete, onDeleteSeries, onToggle, onTrack, onViewLog, onDropWorkout }) {
  const today = isToday(day.date)
  const colRef = useRef(null)

  // Licznik zagnieżdżonych dragenter/dragleave — pojedynczy boolean migocze
  // przy przechodzeniu nad kartami wewnątrz kolumny
  const dragDepth = useRef(0)
  const [dragOver, setDragOver] = useState(false)

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

  const isWorkoutDrag = (e) => e.dataTransfer.types.includes(DRAG_MIME)

  const handleDragEnter = (e) => {
    if (!isWorkoutDrag(e)) return
    dragDepth.current += 1
    setDragOver(true)
  }

  const handleDragOver = (e) => {
    if (!isWorkoutDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = (e) => {
    if (!isWorkoutDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return
    try {
      const { id, day: fromDay } = JSON.parse(raw)
      if (id && fromDay && fromDay !== day.key) onDropWorkout?.(fromDay, id)
    } catch { /* uszkodzone dane przeciągania — ignoruj */ }
  }

  return (
    <div
      className={`tp-col${dragOver ? ' drag-over' : ''}`}
      ref={colRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
            draggable
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteSeries={onDeleteSeries}
            onToggle={onToggle}
            onTrack={onTrack}
            onViewLog={onViewLog}
          />
        ))}
      </div>
    </div>
  )
}
