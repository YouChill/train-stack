import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, FileText, Grid, Layers, LogOut, MoreVertical, Plus, Settings, Sparkles, Upload } from 'lucide-react'

const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia']

function fmtWeekRange(days) {
  const fmt = (d) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(days[0].date)} – ${fmt(days[6].date)}`
}

function fmtDayLabel(day) {
  if (!day) return ''
  return `${day.full}, ${day.date.getDate()} ${MONTHS_GEN[day.date.getMonth()]}`
}

export default function Header({
  hdrRef, compact, days, stats, user, view, selDay,
  onPrev, onNext, onToday, onAdd, onImport, onAI, onCat, onStats, onReport, onLogout,
  onSetView,
}) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  const selectedDay = days.find((d) => d.key === selDay)
  const wrange = view === 'week' ? fmtWeekRange(days) : fmtDayLabel(selectedDay)

  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const pick = (fn) => () => { setMenu(false); fn() }

  return (
    <header ref={hdrRef} className={`tp-hdr${compact ? ' compact' : ''}`}>
      <div className="tp-logo">TRAIN<em>stack</em></div>
      <div className="tp-div" />

      <div className="tp-wnav">
        <button className="tp-hbtn-ic" onClick={onPrev}><ChevronLeft size={14} /></button>
        <div className={`tp-wrange${view === 'day' ? ' day' : ''}`}>{wrange}</div>
        <button className="tp-hbtn-ic" onClick={onNext}><ChevronRight size={14} /></button>
      </div>

      {/* Na mobile: drugi, zwijany wiersz; na desktopie display:contents — bez wpływu na layout */}
      <div className="tp-hdr-r2">
        <div className="tp-hdr-r2-in">
          <button className="tp-hbtn tp-btn-today" onClick={onToday} style={{ fontSize: 11 }}>Dziś</button>

          <div className="tp-view-sw">
            <button className={view === 'week' ? 'active' : ''} onClick={() => onSetView('week')}>
              <Grid size={11} /> Tydzień
            </button>
            <button className={view === 'day' ? 'active' : ''} onClick={() => onSetView('day')}>
              <Layers size={11} /> Dzień
            </button>
          </div>

          {stats.total > 0 && (
            <div className="tp-prog">
              <div className="tp-prog-bar">
                <div className="tp-prog-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="tp-prog-txt">{stats.done}/{stats.total}</span>
            </div>
          )}
        </div>
      </div>

      <div className="tp-spacer" />

      <div className="tp-actions">
        <button className="tp-hbtn tp-btn-ai" onClick={onAI}><Sparkles size={12} /> <span className="tp-hbtn-text">Generuj AI</span></button>
        <button className="tp-hbtn tp-btn-lime" onClick={onAdd}><Plus size={12} /> <span className="tp-hbtn-text">Dodaj</span></button>

        <div className="tp-menu-wrap" ref={menuRef}>
          <button className="tp-hbtn-ic" onClick={() => setMenu((m) => !m)} title="Więcej opcji">
            <MoreVertical size={14} />
          </button>
          {menu && (
            <div className="tp-menu">
              <button className="tp-menu-it" onClick={pick(onImport)}><Upload size={13} /> Import JSON</button>
              <button className="tp-menu-it" onClick={pick(onStats)}><BarChart3 size={13} /> Statystyki</button>
              <button className="tp-menu-it" onClick={pick(onReport)}><FileText size={13} /> Raport</button>
              <button className="tp-menu-it" onClick={pick(onCat)}><Settings size={13} /> Kategorie</button>
              {user && (
                <>
                  <div className="tp-menu-div" />
                  <div className="tp-menu-user">{user.name}</div>
                  <button className="tp-menu-it danger" onClick={pick(onLogout)}><LogOut size={13} /> Wyloguj</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
