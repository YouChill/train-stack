import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, X } from 'lucide-react'
import * as api from '../api.js'

const FEELINGS = ['', '😫', '😓', '😐', '💪', '🔥']

export default function StatsModal({ discs, onClose }) {
  const [data, setData] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    Promise.all([api.stats.get(), api.logs.all()])
      .then(([s, l]) => { setData(s); setLogs(l) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const disc = (id) => discs.find((d) => d.id === id) || { icon: '🏅', name: id, color: '#606080' }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">📊 Statystyki treningów</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-auth-tabs" style={{ marginBottom: 14 }}>
            <button className={`tp-auth-tab${tab === 'overview' ? ' active' : ''}`}
              onClick={() => setTab('overview')}>
              <BarChart3 size={12} /> Podsumowanie
            </button>
            <button className={`tp-auth-tab${tab === 'history' ? ' active' : ''}`}
              onClick={() => setTab('history')}>
              <TrendingUp size={12} /> Historia
            </button>
          </div>

          {loading && <div className="tp-loading"><div className="tp-spinner" /><p>Ładuję statystyki...</p></div>}

          {!loading && tab === 'overview' && data && (
            <>
              <div className="tp-stats-cards">
                <div className="tp-stat-card">
                  <div className="tp-stat-val">{data.totals.total_logs}</div>
                  <div className="tp-stat-lbl">Treningów zapisanych</div>
                </div>
                <div className="tp-stat-card">
                  <div className="tp-stat-val">{data.totals.unique_workouts}</div>
                  <div className="tp-stat-lbl">Unikalnych treningów</div>
                </div>
                <div className="tp-stat-card">
                  <div className="tp-stat-val">
                    {data.totals.avg_feeling ? FEELINGS[Math.round(data.totals.avg_feeling)] : '—'}
                  </div>
                  <div className="tp-stat-lbl">Średnie samopoczucie</div>
                </div>
              </div>

              {data.byDiscipline.length > 0 && (
                <div className="tp-sec">
                  <div className="tp-sec-t">Podział na dyscypliny</div>
                  {data.byDiscipline.map((d, i) => {
                    const di = disc(d.discipline)
                    const maxCount = Math.max(...data.byDiscipline.map((x) => Number(x.count)))
                    const pct = (Number(d.count) / maxCount) * 100
                    return (
                      <div key={i} className="tp-stat-disc">
                        <span className="tp-stat-disc-icon">{di.icon}</span>
                        <span className="tp-stat-disc-name">{di.name}</span>
                        <div className="tp-stat-bar-wrap">
                          <div className="tp-stat-bar" style={{ width: `${pct}%`, background: di.color }} />
                        </div>
                        <span className="tp-stat-disc-cnt">{d.count}×</span>
                        <span>{d.avg_feeling ? FEELINGS[Math.round(d.avg_feeling)] : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {data.weeklyTrend.length > 0 && (
                <div className="tp-sec">
                  <div className="tp-sec-t">Trend tygodniowy (ostatnie 8 tyg.)</div>
                  <div className="tp-stat-weeks">
                    {data.weeklyTrend.map((w, i) => {
                      const maxW = Math.max(...data.weeklyTrend.map((x) => Number(x.count)))
                      const h = (Number(w.count) / maxW) * 60
                      return (
                        <div key={i} className="tp-stat-week">
                          <div className="tp-stat-week-bar" style={{ height: h }} />
                          <div className="tp-stat-week-cnt">{w.count}</div>
                          <div className="tp-stat-week-lbl">
                            {new Date(w.week).toLocaleDateString('pl', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && tab === 'history' && (
            <div className="tp-log-list">
              {logs.length === 0 && <div style={{ textAlign: 'center', color: '#404060', padding: 20 }}>Brak zapisanych treningów</div>}
              {logs.map((log) => {
                const di = disc(log.discipline)
                return (
                  <div key={log.id} className="tp-log-item">
                    <div className="tp-log-top">
                      <span style={{ fontSize: 14 }}>{di.icon}</span>
                      <span className="tp-log-title">{log.title || di.name}</span>
                      <span className="tp-log-feel">{FEELINGS[log.feeling] || ''}</span>
                      <span className="tp-log-date">
                        {new Date(log.logged_at).toLocaleDateString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {(log.actual_exercises || []).length > 0 && (
                      <div className="tp-log-exs">
                        {log.actual_exercises.map((e, i) => (
                          <span key={i} className="tp-chip">{e.name} {e.sets}×{e.reps}{e.load ? ` @${e.load}${e.loadUnit}` : ''}</span>
                        ))}
                      </div>
                    )}
                    {(log.actual_params || []).length > 0 && (
                      <div className="tp-log-exs">
                        {log.actual_params.map((p, i) => (
                          <span key={i} className="tp-chip">{p.key}: {p.value} {p.unit}</span>
                        ))}
                      </div>
                    )}
                    {log.note && <div className="tp-card-note" style={{ marginTop: 4 }}>{log.note}</div>}
                  </div>
                )
              })}
            </div>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Zamknij</button>
          </div>
        </div>
      </div>
    </div>
  )
}
