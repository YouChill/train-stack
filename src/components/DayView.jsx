import { Fragment, useRef, useEffect, useMemo } from 'react'
import { Moon, Plus } from 'lucide-react'
import { isToday } from '../utils.js'
import DayCard from './DayCard.jsx'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 – 22:00

function fmtMonthYear(date) {
  const months = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function weekNum(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export default function DayView({ days, wkts, off, selDay, setSelDay, discs, logCounts, pageCompact, onAdd, onView, onEdit, onDelete, onDeleteSeries, onToggle, onTrack }) {
  const nowSlotRef = useRef(null)

  const day = days.find((d) => d.key === selDay) || days[0]
  const dayIsToday = isToday(day.date)

  const wk = (dayKey) => `${off}|${dayKey}`
  const list = useMemo(
    () => (wkts[wk(selDay)] || []).slice().sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz')),
    [wkts, selDay, off],
  )

  const planned = list.filter((w) => !w.rest).length
  const done = list.filter((w) => w.done && !w.rest).length
  const totalVol = list.reduce((acc, w) => {
    const exVol = (w.exercises || []).reduce(
      (s, ex) => s + (parseFloat(ex.sets) || 0) * (parseFloat(ex.reps) || 0) * (parseFloat(ex.load) || 0),
      0,
    )
    return acc + exVol
  }, 0)
  const totalMin = list.reduce((acc, w) => {
    const p = (w.params || []).find(
      (x) => x.unit === 'min' && (x.key.toLowerCase().includes('czas') || x.key.toLowerCase().includes('trwan')),
    )
    return acc + (p ? parseFloat(p.value) || 0 : 0)
  }, 0)

  // Slots
  const slots = HOURS.map((h) => ({
    h,
    items: list.filter((w) => {
      if (!w.start_time) return false
      return parseInt(w.start_time.split(':')[0]) === h
    }),
  }))
  const unscheduled = list.filter((w) => !w.start_time && !w.rest)
  const restItems = list.filter((w) => w.rest)

  // Now indicator
  const now = new Date()
  const nowH = now.getHours()
  const nowM = now.getMinutes()
  const showNow = dayIsToday && nowH >= 6 && nowH <= 22

  useEffect(() => {
    if (showNow && nowSlotRef.current) {
      // strona przewija się w oknie; ~200px zapasu na sticky nagłówek i pasek dni
      const y = nowSlotRef.current.getBoundingClientRect().top + window.scrollY - 200
      window.scrollTo(0, Math.max(0, y))
    }
  }, [selDay, showNow])

  return (
    <div className="tp-dayview">
      {/* Day strip */}
      <div className={`tp-dv-strip${pageCompact ? ' compact' : ''}`}>
        {days.map((d) => {
          const dList = wkts[wk(d.key)] || []
          const dPlanned = dList.filter((w) => !w.rest)
          const dRest = dList.some((w) => w.rest)
          const dIsToday = isToday(d.date)
          return (
            <div
              key={d.key}
              className={`tp-dv-strip-d${d.key === selDay ? ' sel' : ''}${dIsToday ? ' today-d' : ''}`}
              onClick={() => setSelDay(d.key)}
            >
              <div className="tp-dv-strip-top">
                <span className="tp-dv-strip-day">{d.s}</span>
                <span className="tp-dv-strip-num">{d.date.getDate()}</span>
              </div>
              <div className="tp-dv-strip-dots">
                {dRest ? (
                  <span className="tp-dv-strip-rest">odpoczynek</span>
                ) : dPlanned.length === 0 ? (
                  <span className="tp-dv-strip-rest">—</span>
                ) : (
                  dPlanned.slice(0, 5).map((w, i) => {
                    const disc = discs.find((x) => x.id === w.discipline) || discs[0]
                    return (
                      <span
                        key={i}
                        className="tp-dv-strip-dot"
                        style={{ background: w.done ? disc.color + '40' : disc.color }}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day header */}
      <div className={`tp-dv-hdr${pageCompact ? ' compact' : ''}`}>
        <div className="tp-dv-date-block">
          <div className={`tp-dv-dnum${dayIsToday ? '' : ' not-today'}`}>{day.date.getDate()}</div>
          <div className="tp-dv-dmeta">
            <div className="tp-dv-dname">
              {day.full}
              {dayIsToday && <span className="tp-dv-tag-today">Dziś</span>}
            </div>
            <div className="tp-dv-dsub">
              tydzień {String(weekNum(day.date)).padStart(2, '0')} · {fmtMonthYear(day.date)}
            </div>
          </div>
        </div>
        <div className="tp-dv-spacer" />
        <div className="tp-dv-summary">
          <div className="tp-dv-summary-item">
            <div className="tp-dv-summary-val lime">{done}/{planned}</div>
            <div className="tp-dv-summary-lbl">Wykonane</div>
          </div>
          <div className="tp-dv-summary-item">
            <div className="tp-dv-summary-val">{totalMin || '–'}{totalMin ? ' min' : ''}</div>
            <div className="tp-dv-summary-lbl">Czas planu</div>
          </div>
          {totalVol > 0 && (
            <div className="tp-dv-summary-item">
              <div className="tp-dv-summary-val">
                {Math.round(totalVol)}<span style={{ fontSize: 12, color: 'var(--ink-2)', marginLeft: 2 }}>kg</span>
              </div>
              <div className="tp-dv-summary-lbl">Wolumen</div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline body */}
      <div className="tp-dv-body">
        {list.length === 0 && (
          <div className="tp-dv-empty-day">
            <h3>Nic zaplanowane na ten dzień</h3>
            <p>Kliknij na osi czasu lub użyj „Dodaj", żeby zaplanować trening.</p>
            <button className="tp-btn tp-bl" onClick={() => onAdd(selDay)}>
              <Plus size={13} /> Dodaj trening
            </button>
          </div>
        )}

        {list.length > 0 && (
          <>
            {restItems.length > 0 && (
              <>
                <div className="tp-dv-hour">—</div>
                <div className="tp-dv-slot" style={{ minHeight: 'auto' }}>
                  {restItems.map((w) => (
                    <div key={w.id} className="tp-dv-rest"><Moon size={14} /> Dzień odpoczynku — regeneracja &amp; rozciąganie</div>
                  ))}
                </div>
              </>
            )}

            {unscheduled.map((w) => (
              <Fragment key={w.id}>
                <div className="tp-dv-hour">bez godz.</div>
                <div className="tp-dv-slot" style={{ minHeight: 'auto' }}>
                  <DayCard
                    w={w}
                    discs={discs}
                    logCounts={logCounts}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={() => onDelete(w.day, w.id)}
                    onDeleteSeries={() => onDeleteSeries(w.day, w.id)}
                    onToggle={() => onToggle(w.day, w.id)}
                    onTrack={() => onTrack(w)}
                  />
                </div>
              </Fragment>
            ))}

            {slots.map((slot) => {
              const isNowHour = dayIsToday && slot.h === nowH
              return (
                <Fragment key={slot.h}>
                  <div className={`tp-dv-hour${isNowHour ? ' now' : ''}`}>
                    {String(slot.h).padStart(2, '0')}:00
                  </div>
                  <div
                    ref={isNowHour ? nowSlotRef : null}
                    className={`tp-dv-slot${slot.items.length === 0 ? ' empty' : ''}`}
                    onClick={() => slot.items.length === 0 && onAdd(selDay, `${String(slot.h).padStart(2, '0')}:00`)}
                  >
                    {slot.items.map((w) => (
                      <DayCard
                        key={w.id}
                        w={w}
                        discs={discs}
                        logCounts={logCounts}
                        onEdit={() => onEdit(w)}
                        onDelete={() => onDelete(w.day, w.id)}
                        onDeleteSeries={() => onDeleteSeries(w.day, w.id)}
                        onToggle={() => onToggle(w.day, w.id)}
                        onTrack={() => onTrack(w)}
                      />
                    ))}
                    {isNowHour && (
                      <div className="tp-dv-nowline" style={{ top: `${(nowM / 60) * 100}%` }}>
                        <span className="tp-dv-nowline-lbl">
                          {String(nowH).padStart(2, '0')}:{String(nowM).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </Fragment>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
