import { useState, useEffect, useCallback } from 'react'
import CSS from './styles.js'
import { DAYS, DEFAULT_DISCIPLINES } from './constants.js'
import { uid, getWeekDates } from './utils.js'
import * as api from './api.js'

import Header      from './components/Header.jsx'
import DayColumn   from './components/DayColumn.jsx'
import AddModal    from './components/AddModal.jsx'
import ImportModal from './components/ImportModal.jsx'
import AIModal     from './components/AIModal.jsx'
import CatModal    from './components/CatModal.jsx'
import AuthModal   from './components/AuthModal.jsx'

export default function App() {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  const [off,   setOff]   = useState(0)
  const [wkts,  setWkts]  = useState({})
  const [discs, setDiscs] = useState(DEFAULT_DISCIPLINES)

  const [addM,  setAddM]  = useState(null)
  const [impM,  setImpM]  = useState(false)
  const [aiM,   setAiM]   = useState(false)
  const [catM,  setCatM]  = useState(false)

  const days  = getWeekDates(off)
  const wk    = (day) => `${off}|${day}`
  const getDW = (day) => wkts[wk(day)] || []

  // ── AUTH ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('ts_token')
    if (!token) { setReady(true); return }
    api.auth.me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('ts_token'))
      .finally(() => setReady(true))
  }, [])

  const handleAuth = async (mode, creds) => {
    const fn = mode === 'login' ? api.auth.login : api.auth.register
    const data = await fn(creds)
    localStorage.setItem('ts_token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('ts_token')
    setUser(null)
    setWkts({})
    setDiscs(DEFAULT_DISCIPLINES)
  }

  // ── SYNC: load workouts when week changes ─────────────────────────────────
  const fetchWeek = useCallback(async (weekOff) => {
    if (!user) return
    try {
      const rows = await api.workouts.list(weekOff)
      const grouped = {}
      for (const r of rows) {
        const k = `${weekOff}|${r.day}`
        if (!grouped[k]) grouped[k] = []
        grouped[k].push(r)
      }
      setWkts((prev) => {
        // clear old keys for this week offset, add new
        const next = { ...prev }
        DAYS.forEach((d) => { next[`${weekOff}|${d.key}`] = grouped[`${weekOff}|${d.key}`] || [] })
        return next
      })
    } catch { /* offline fallback — keep local state */ }
  }, [user])

  useEffect(() => { fetchWeek(off) }, [off, fetchWeek])

  // ── SYNC: load disciplines on login ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    api.disciplines.list()
      .then((rows) => {
        if (rows.length) {
          setDiscs(rows.map((r) => ({
            id: r.ext_id, name: r.name, icon: r.icon, color: r.color,
            hasEx: r.has_ex, dp: r.default_params || [],
          })))
        }
      })
      .catch(() => {})
  }, [user])

  // ── RECURRENCE HELPER ──────────────────────────────────────────────────────
  const expandRecurrence = (w, baseOff) => {
    const rec = w.recurrence
    if (!rec) return []
    const copies = []
    const weeksAhead = 12 // generate 12 weeks ahead
    const interval = rec.interval || 1

    for (let i = 1; i <= weeksAhead; i++) {
      if (rec.type === 'weekly' && i % interval !== 0) continue
      if (rec.type === 'monthly' && i % 4 !== 0) continue

      const targetOff = baseOff + i
      if (rec.days) {
        for (const d of rec.days) {
          copies.push({ ...w, id: undefined, day: d, week_offset: targetOff, recurrence: rec })
        }
      } else {
        copies.push({ ...w, id: undefined, day: w.day, week_offset: targetOff, recurrence: rec })
      }
    }
    return copies
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const upsert = async (w) => {
    if (user) {
      try {
        if (w.id) {
          const updated = await api.workouts.update(w.id, w)
          const k = wk(w.day)
          setWkts((prev) => ({ ...prev, [k]: (prev[k] || []).map((x) => (x.id === updated.id ? updated : x)) }))
        } else {
          const created = await api.workouts.create({ ...w, week_offset: off })
          const k = wk(w.day)
          setWkts((prev) => ({ ...prev, [k]: [...(prev[k] || []), created] }))

          // Create recurring copies in background
          if (w.recurrence) {
            const copies = expandRecurrence(w, off)
            for (const c of copies) {
              try { await api.workouts.create(c) } catch {}
            }
          }
        }
      } catch (e) { console.error('Workout save error:', e); alert('Błąd zapisu: ' + e.message) }
    } else {
      const k = wk(w.day)
      setWkts((prev) => {
        const list = prev[k] || []
        if (w.id) return { ...prev, [k]: list.map((x) => (x.id === w.id ? w : x)) }
        const next = { ...prev, [k]: [...list, { ...w, id: uid() }] }

        // Local recurrence
        if (w.recurrence) {
          const copies = expandRecurrence(w, off)
          for (const c of copies) {
            const ck = `${c.week_offset}|${c.day}`
            next[ck] = [...(next[ck] || []), { ...c, id: uid() }]
          }
        }
        return next
      })
    }
    setAddM(null)
  }

  const del = async (day, id) => {
    const k = wk(day)
    setWkts((prev) => ({ ...prev, [k]: (prev[k] || []).filter((w) => w.id !== id) }))
    if (user) { try { await api.workouts.remove(id) } catch {} }
  }

  const toggle = async (day, id) => {
    const k = wk(day)
    let toggled
    setWkts((prev) => ({
      ...prev,
      [k]: (prev[k] || []).map((w) => {
        if (w.id === id) { toggled = { ...w, done: !w.done }; return toggled }
        return w
      }),
    }))
    if (user && toggled) { try { await api.workouts.update(id, toggled) } catch {} }
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────
  const importW = async (parsed) => {
    if (user) {
      try {
        const rows = await api.workouts.import_({ week_offset: off, week: parsed.week })
        const grouped = {}
        for (const r of rows) {
          const k = `${off}|${r.day}`
          if (!grouped[k]) grouped[k] = []
          grouped[k].push(r)
        }
        setWkts((prev) => {
          const next = { ...prev }
          DAYS.forEach((d) => { next[`${off}|${d.key}`] = grouped[`${off}|${d.key}`] || [] })
          return next
        })
      } catch { /* fallback */ }
    } else {
      const ns = { ...wkts }
      const weeks = parsed.weeks || { [off]: parsed.week }
      for (const [o, days_] of Object.entries(weeks)) {
        for (const [d, list] of Object.entries(days_)) {
          ns[`${o}|${d}`] = (list || []).map((w) => ({ ...w, id: uid(), done: false }))
        }
      }
      setWkts(ns)
    }
    setImpM(false)
    setAiM(false)
  }

  // ── DISCIPLINES SAVE ─────────────────────────────────────────────────────
  const saveDiscs = async (newDiscs) => {
    setDiscs(newDiscs)
    if (user) { try { await api.disciplines.save(newDiscs) } catch {} }
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

  if (!ready) return <><style>{CSS}</style><div className="tp" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="tp-spinner" /></div></>

  return (
    <>
      <style>{CSS}</style>

      {!user && <AuthModal onAuth={handleAuth} />}

      <div className="tp">
        <Header
          days={days}
          stats={stats}
          user={user}
          onPrev={()  => setOff((o) => o - 1)}
          onNext={()  => setOff((o) => o + 1)}
          onToday={()  => setOff(0)}
          onAdd={()   => setAddM({})}
          onImport={() => setImpM(true)}
          onAI={()    => setAiM(true)}
          onCat={()   => setCatM(true)}
          onLogout={logout}
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
      {catM && <CatModal discs={discs} onChange={saveDiscs} onClose={() => setCatM(false)} />}
    </>
  )
}
