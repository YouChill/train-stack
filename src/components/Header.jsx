import { BarChart3, ChevronLeft, ChevronRight, LogOut, Plus, Settings, Sparkles, Upload } from 'lucide-react'
import { fmtDate } from '../utils.js'

export default function Header({ days, stats, user, onPrev, onNext, onToday, onAdd, onImport, onAI, onCat, onStats, onLogout }) {
  const range = `${fmtDate(days[0].date)} – ${fmtDate(days[6].date)}`
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <header className="tp-hdr">
      <div className="tp-logo">TRAIN<em>stack</em></div>
      <div className="tp-div" />

      <div className="tp-wnav">
        <button className="tp-hbtn-ic" onClick={onPrev}><ChevronLeft size={14} /></button>
        <div className="tp-wrange">{range}</div>
        <button className="tp-hbtn-ic" onClick={onNext}><ChevronRight size={14} /></button>
      </div>

      <button className="tp-hbtn" onClick={onToday} style={{ fontSize: 11 }}>Dziś</button>

      {stats.total > 0 && (
        <div className="tp-prog">
          <div className="tp-prog-bar">
            <div className="tp-prog-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="tp-prog-txt">{stats.done}/{stats.total}</span>
        </div>
      )}

      <div className="tp-spacer" />

      <button className="tp-hbtn-ic" onClick={onStats} title="Statystyki"><BarChart3 size={14} /></button>
      <button className="tp-hbtn-ic" onClick={onCat} title="Kategorie"><Settings size={14} /></button>
      <button className="tp-hbtn" onClick={onImport}><Upload size={12} /> <span className="tp-hbtn-text">Import</span></button>
      <button className="tp-hbtn tp-btn-ai" onClick={onAI}><Sparkles size={12} /> <span className="tp-hbtn-text">Generuj AI</span></button>
      <button className="tp-hbtn tp-btn-lime" onClick={onAdd}><Plus size={12} /> <span className="tp-hbtn-text">Dodaj</span></button>

      {user && (
        <>
          <div className="tp-div" />
          <span className="tp-user-name">{user.name}</span>
          <button className="tp-hbtn-ic" onClick={onLogout} title="Wyloguj"><LogOut size={14} /></button>
        </>
      )}
    </header>
  )
}
