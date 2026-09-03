import { useRef, useState } from 'react'
import { Check, RefreshCw, Upload, Watch, X } from 'lucide-react'
import * as api from '../api.js'
import { parseFiles } from '../garmin/parse.js'
import { plural } from '../utils.js'

// Import wykonanych aktywności z Garmin Connect: pliki są parsowane w
// przeglądarce, serwer robi "dry run" (dopasowanie do planu, wykrycie
// duplikatów), użytkownik poprawia dyscypliny i zatwierdza właściwy import.

const STATUS = {
  matched:   { label: 'dopasowano do planu', cls: 'ok' },
  created:   { label: 'nowy trening',        cls: 'new' },
  duplicate: { label: 'duplikat',            cls: 'dup' },
  skipped:   { label: 'wybierz dyscyplinę',  cls: 'warn' },
  invalid:   { label: 'błąd',                cls: 'err' },
}
const IMPORTABLE = new Set(['matched', 'created'])

const fmtWhen = (iso) => {
  const [d, t] = iso.split('T')
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y} ${t.slice(0, 5)}`
}

const fmtMetrics = (a) => {
  const parts = []
  if (a.distance_m > 0) parts.push(/swim|plyw|basen/i.test(a.type) ? `${Math.round(a.distance_m)} m` : `${(a.distance_m / 1000).toFixed(2)} km`)
  if (a.duration_s > 0) parts.push(`${Math.round(a.duration_s / 60)} min`)
  if (a.avg_hr > 0) parts.push(`${Math.round(a.avg_hr)} bpm`)
  return parts.join(' · ')
}

const toPayload = (it) => {
  const { file, ...act } = it.act
  return it.discipline ? { ...act, discipline: it.discipline } : act
}

export default function GarminImportModal({ user, discs = [], onDone, onClose }) {
  const [items, setItems] = useState([])     // { act, discipline, include, res }
  const [fileErrors, setFileErrors] = useState([])
  const [busy, setBusy] = useState('')       // '' | 'parse' | 'preview' | 'import'
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Podgląd = identyczna ścieżka co import, tylko z ROLLBACK po stronie serwera.
  const preview = async (list) => {
    if (!list.length) return
    setBusy('preview')
    setErr('')
    try {
      const r = await api.activities.import_({ activities: list.map(toPayload), dry_run: true, tz })
      const byIndex = new Map(r.results.map((x) => [x.index, x]))
      setItems(list.map((it, i) => {
        const res = byIndex.get(i) || { status: 'invalid', reason: 'brak odpowiedzi' }
        return {
          ...it,
          res,
          discipline: it.discipline || res.discipline || '',
          include: it.touched ? it.include && IMPORTABLE.has(res.status) : IMPORTABLE.has(res.status),
        }
      }))
    } catch (e) {
      setErr('Nie udało się przygotować podglądu: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setBusy('parse')
    setErr('')
    const { activities, errors } = await parseFiles(files)
    setFileErrors((prev) => [...prev, ...errors])
    const known = new Set(items.map((it) => it.act.external_id))
    const fresh = activities.filter((a) => !known.has(a.external_id)).map((act) => ({ act, discipline: '', include: true, res: null }))
    const next = [...items, ...fresh]
    setItems(next)
    setBusy('')
    if (fresh.length) await preview(next)
  }

  const setDiscipline = (i, discipline) => {
    const next = items.map((it, k) => (k === i ? { ...it, discipline, res: null } : it))
    setItems(next)
    preview(next)
  }

  const toggle = (i) => setItems((prev) => prev.map((it, k) => (k === i ? { ...it, include: !it.include, touched: true } : it)))

  const doImport = async () => {
    const chosen = items.filter((it) => it.include && it.res && IMPORTABLE.has(it.res.status))
    if (!chosen.length) return
    setBusy('import')
    setErr('')
    try {
      const r = await api.activities.import_({ activities: chosen.map(toPayload), dry_run: false, tz })
      setResult(r.summary)
      onDone?.()
    } catch (e) {
      setErr('Błąd importu: ' + e.message)
    } finally {
      setBusy('')
    }
  }

  const selectable = items.filter((it) => it.res && IMPORTABLE.has(it.res.status))
  const selected = selectable.filter((it) => it.include).length
  const discName = (id) => discs.find((d) => d.id === id)

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w tp-modal-xl">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">⌚ Import z Garmin</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          {!user ? (
            <div className="tp-gi-empty">Import z Garmina wymaga zalogowania — aktywności są dopasowywane do planu zapisanego na koncie.</div>
          ) : result ? (
            <div className="tp-gi-done">
              <Check size={28} />
              <div className="tp-gi-done-t">Zaimportowano {result.matched + result.created} {plural(result.matched + result.created, 'aktywność', 'aktywności', 'aktywności')}</div>
              <div className="tp-gi-done-s">
                dopasowano do planu: {result.matched} · nowe treningi: {result.created}
                {result.duplicate ? ` · pominięte duplikaty: ${result.duplicate}` : ''}
              </div>
            </div>
          ) : (
            <>
              <div
                className={`tp-gi-drop${drag ? ' over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={18} />
                <div>
                  <b>Wybierz lub przeciągnij pliki</b>
                  <div className="tp-gi-drop-s">.fit lub .zip („Eksportuj oryginał”) albo .csv (lista aktywności)</div>
                </div>
                <input
                  ref={fileRef} type="file" multiple accept=".fit,.zip,.csv" style={{ display: 'none' }}
                  onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              <details className="tp-imp-sec tp-gi-help">
                <summary>Skąd wziąć pliki z Garmin Connect?</summary>
                <div className="tp-imp-sec-body">
                  <div className="tp-gi-help-p"><b>Pojedyncza aktywność (FIT):</b> connect.garmin.com → otwórz aktywność → ikona koła zębatego → <i>Eksportuj oryginał</i>. Pobrany ZIP wgraj bez rozpakowywania.</div>
                  <div className="tp-gi-help-p"><b>Wiele aktywności (CSV):</b> connect.garmin.com → Aktywności → Wszystkie aktywności → <i>Eksportuj CSV</i>. Plik zawiera podsumowania (dystans, czas, tętno) bez trasy.</div>
                  <div className="tp-gi-help-p"><b>Automatycznie:</b> skrypt <code>scripts/garmin-sync</code> pobiera nowe aktywności z Garmin Connect i wysyła je przez API agenta — opis w <code>docs/garmin.md</code>.</div>
                  <div className="tp-gi-help-p">Aktywność z dnia i dyscypliny, na które masz zaplanowany trening, trafia do jego dziennika i odhacza go. Pozostałe tworzą nowy, wykonany trening.</div>
                </div>
              </details>

              {fileErrors.length > 0 && (
                <div className="tp-gi-errors">
                  {fileErrors.map((e, i) => <div key={i} className="tp-err">{e.file}: {e.message}</div>)}
                </div>
              )}

              {busy === 'parse' && <div className="tp-loading"><div className="tp-spinner" /><p>Czytam pliki...</p></div>}

              {items.length > 0 && (
                <div className="tp-gi-list">
                  <div className="tp-gi-row tp-gi-head">
                    <span />
                    <span>Data</span>
                    <span>Aktywność</span>
                    <span>Dyscyplina</span>
                    <span>Status</span>
                  </div>
                  {items.map((it, i) => {
                    const st = it.res ? STATUS[it.res.status] || STATUS.invalid : null
                    const can = it.res && IMPORTABLE.has(it.res.status)
                    const d = discName(it.discipline)
                    return (
                      <div key={it.act.external_id} className={`tp-gi-row${can && it.include ? '' : ' muted'}`}>
                        <input type="checkbox" checked={!!(can && it.include)} disabled={!can} onChange={() => toggle(i)} />
                        <span className="tp-gi-when">{fmtWhen(it.act.started_at_local)}</span>
                        <span className="tp-gi-what">
                          <span className="tp-gi-title">{it.act.title || it.act.type}</span>
                          <span className="tp-gi-meta">{[it.act.title ? it.act.type : '', fmtMetrics(it.act)].filter(Boolean).join(' · ')}</span>
                        </span>
                        <select
                          className="tp-sm" value={it.discipline} onChange={(e) => setDiscipline(i, e.target.value)}
                          disabled={it.res?.status === 'duplicate'}
                          style={d ? { borderColor: d.color } : undefined}
                        >
                          <option value="">— wybierz —</option>
                          {discs.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
                        </select>
                        <span className={`tp-gi-status ${st ? st.cls : ''}`} title={it.res?.reason || ''}>
                          {!it.res ? <RefreshCw size={11} className="tp-gi-spin" /> : (
                            <>
                              {st.label}
                              {it.res.status === 'matched' && it.res.workout?.title ? <span className="tp-gi-sub">→ {it.res.workout.title}</span> : null}
                              {it.res.status === 'invalid' && it.res.reason ? <span className="tp-gi-sub">{it.res.reason}</span> : null}
                            </>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {err && <div className="tp-err">{err}</div>}
            </>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>{result ? 'Zamknij' : 'Anuluj'}</button>
            {user && !result && (
              <button className="tp-btn tp-bl" onClick={doImport} disabled={!selected || !!busy}>
                <Watch size={13} /> {busy === 'import' ? 'Importuję...' : `Importuj${selected ? ` (${selected})` : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
