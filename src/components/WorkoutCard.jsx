import { useState, useRef, useEffect } from 'react'
import { Check, ClipboardList, Clock, Dumbbell, Edit3, History, Moon, Repeat } from 'lucide-react'
import ConfirmDelete from './ConfirmDelete.jsx'
import { plural } from '../utils.js'

// Typ danych przeciągania rozpoznawany przez kolumny dni (musi być małymi literami)
export const DRAG_MIME = 'application/x-trainstack-workout'

// Klasa podświetlenia kolumny podczas przeciągania dotykowego (poza React,
// żeby nie kolidować z re-renderem sterowanym stanem `drag-over` z HTML5 DnD)
const TOUCH_OVER = 'tp-touch-over'
const LONG_PRESS_MS = 200   // przytrzymanie palca uruchamiające przeciąganie
const SCROLL_SLOP   = 10     // ruch przed uruchomieniem = przewijanie, nie drag

export default function WorkoutCard({ w, discs, logCount, draggable, onMove, onView, onEdit, onDelete, onDeleteSeries, onToggle, onTrack, onViewLog }) {
  const d = discs.find((x) => x.id === w.discipline) || discs[0]
  const filled = (w.params || []).filter((p) => p.value)
  const exCnt = (w.exercises || []).length
  const logged = logCount > 0
  const [dragging, setDragging] = useState(false)

  const cardRef = useRef(null)
  const touch = useRef(null)

  const dragProps = draggable ? {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ id: w.id, day: w.day }))
      e.dataTransfer.effectAllowed = 'move'
      setDragging(true)
    },
    onDragEnd: () => setDragging(false),
  } : {}

  // ── Przeciąganie dotykowe (HTML5 DnD nie działa dotykiem) ──────────────────
  useEffect(() => {
    const el = cardRef.current
    if (!draggable || !el) return

    const clearHighlights = () =>
      document.querySelectorAll('.' + TOUCH_OVER).forEach((c) => c.classList.remove(TOUCH_OVER))

    const beginDrag = () => {
      const s = touch.current
      if (!s) return
      s.active = true
      const rect = el.getBoundingClientRect()
      s.offsetX = s.startX - rect.left
      s.offsetY = s.startY - rect.top
      const clone = el.cloneNode(true)
      clone.classList.add('tp-touch-clone')
      clone.style.width = rect.width + 'px'
      clone.style.left = rect.left + 'px'
      clone.style.top = rect.top + 'px'
      document.body.appendChild(clone)
      s.clone = clone
      el.classList.add('dragging')
      document.body.classList.add('tp-touch-dragging')
      if (navigator.vibrate) navigator.vibrate(12)
    }

    const endDrag = (commit) => {
      const s = touch.current
      if (!s) return
      touch.current = null
      clearTimeout(s.timer)
      s.clone?.remove()
      el.classList.remove('dragging')
      document.body.classList.remove('tp-touch-dragging')
      let toDay = null
      if (s.active && s.curCol) toDay = s.curCol.getAttribute('data-day')
      clearHighlights()
      if (s.active && commit && toDay && toDay !== w.day) onMove?.(w.day, toDay, w.id)
      // Po zakończonym geście przeciągania zablokuj wynikające z niego kliknięcie
      if (s.active) {
        const suppress = (ev) => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', suppress, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', suppress, { capture: true }), 400)
      }
    }

    const onStart = (e) => {
      if (e.touches.length !== 1) return
      // Dotknięcie przycisków w stopce karty nie inicjuje przeciągania
      if (e.target.closest('.tp-card-ft')) return
      const t = e.touches[0]
      touch.current = { startX: t.clientX, startY: t.clientY, active: false, clone: null, curCol: null }
      touch.current.timer = setTimeout(beginDrag, LONG_PRESS_MS)
    }

    const onMoveT = (e) => {
      const s = touch.current
      if (!s) return
      const t = e.touches[0]
      if (!s.active) {
        // ruch przed długim przytrzymaniem = użytkownik przewija listę
        if (Math.abs(t.clientX - s.startX) > SCROLL_SLOP || Math.abs(t.clientY - s.startY) > SCROLL_SLOP) {
          clearTimeout(s.timer)
          touch.current = null
        }
        return
      }
      e.preventDefault()
      s.clone.style.left = (t.clientX - s.offsetX) + 'px'
      s.clone.style.top = (t.clientY - s.offsetY) + 'px'
      const under = document.elementFromPoint(t.clientX, t.clientY)
      const col = under ? under.closest('.tp-col') : null
      if (col !== s.curCol) {
        clearHighlights()
        s.curCol = col
        if (col && col.getAttribute('data-day') !== w.day) col.classList.add(TOUCH_OVER)
      }
    }

    const onEnd = () => endDrag(true)
    const onCancel = () => endDrag(false)

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMoveT, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onCancel)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMoveT)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
      endDrag(false)
    }
  }, [draggable, w.day, w.id, onMove])

  if (w.rest) return <div ref={cardRef} className={`tp-rest-card${dragging ? ' dragging' : ''}`} {...dragProps}><Moon size={13} /> Odpoczynek</div>

  return (
    <div ref={cardRef} className={`tp-card${w.done ? ' done' : ''}${dragging ? ' dragging' : ''}`} style={{ '--dc': d.color }} onClick={() => onView(w)} {...dragProps}>
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
