import { useState } from 'react'
import CSS from './styles.js'
import { DAYS, DEFAULT_DISCIPLINES } from './constants.js'
import { uid, getWeekDates } from './utils.js'

import Header    from './components/Header.jsx'
import DayColumn from './components/DayColumn.jsx'
import AddModal  from './components/AddModal.jsx'
import ImportModal from './components/ImportModal.jsx'
import AIModal   from './components/AIModal.jsx'
import CatModal  from './components/CatModal.jsx'

export default function App() {
  const [off,   setOff]   = useState(0)
  const [wkts,  setWkts]  = useState({})
  const [discs, setDiscs] = useState(DEFAULT_DISCIPLINES)

  const [addM,  setAddM]  = useState(null)   // null | { day?, workout? }
  const [impM,  setImpM]  = useState(false)
  const [aiM,   setAiM]   = useState(false)
  const [catM,  setCatM]  = useState(false)

  const days  = getWeekDates(off)
  const wk    = (day) => `${off}|${day}`
  const getDW = (day) => wkts[wk(day)] || []

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const upsert = (w) => {
    const k = wk(w.day)
    setWkts((prev) => {
      const list = prev[k] || []
      if (w.id) return { ...prev, [k]: list.map((x) => (x.id === w.id ? w : x)) }
      return { ...prev, [k]: [...list, { ...w, id: uid() }] }
    })
    setAddM(null)
  }

  const del = (day, id) => {
    const k = wk(day)
    setWkts((prev) => ({ ...prev, [k]: (prev[k] || []).filter((w) => w.id !== id) }))
  }

  const toggle = (day, id) => {
    const k = wk(day)
    setWkts((prev) => ({
      ...prev,
      [k]: (prev[k] || []).map((w) => (w.id === id ? { ...w, done: !w.done } : w)),
    }))
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────
  const importW = (parsed) => {
    const ns = { ...wkts }
    // Support both { week: {...} } (current week) and { weeks: { offset: {...} } } (multi-week)
    const weeks = parsed.weeks || { [off]: parsed.week }
    for (const [o, days_] of Object.entries(weeks)) {
      for (const [d, list] of Object.entries(days_)) {
        ns[`${o}|${d}`] = (list || []).map((w) => ({ ...w, id: uid(), done: false }))
      }
    }
    setWkts(ns)
    setImpM(false)
    setAiM(false)
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  const stats = DAYS.reduce(
    (a, d) => {
      const dw = getDW(d.key).filter((w) => !w.rest)
      a.total += dw.length
      a.done  += dw.filter((w) => w.done).length
      return a
    },
    { total: 0, done: 0 },
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="tp">
        <Header
          days={days}
          stats={stats}
          onPrev={()  => setOff((o) => o - 1)}
          onNext={()  => setOff((o) => o + 1)}
          onToday={()  => setOff(0)}
          onAdd={()   => setAddM({})}
          onImport={() => setImpM(true)}
          onAI={()    => setAiM(true)}
          onCat={()   => setCatM(true)}
        />

        <main className="tp-board">
          {days.map((day) => (
            <DayColumn
              key={day.key}
              day={day}
              workouts={getDW(day.key)}
              discs={discs}
              onAdd={()     => setAddM({ day: day.key })}
              onEdit={(w)   => setAddM({ day: w.day, workout: w })}
              onDelete={(id) => del(day.key, id)}
              onToggle={(id) => toggle(day.key, id)}
            />
          ))}
        </main>
      </div>

      {addM !== null && (
        <AddModal
          targetDay={addM.day || 'mon'}
          workout={addM.workout}
          discs={discs}
          onSave={upsert}
          onClose={() => setAddM(null)}
        />
      )}
      {impM && <ImportModal onImport={importW} onClose={() => setImpM(false)} />}
      {aiM  && <AIModal discs={discs} onImport={importW} onClose={() => setAiM(false)} />}
      {catM && <CatModal discs={discs} onChange={setDiscs} onClose={() => setCatM(false)} />}
    </>
  )
}
