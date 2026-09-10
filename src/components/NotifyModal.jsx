import { useEffect, useState } from 'react'
import { Bell, Send, Smartphone, Trash2, X } from 'lucide-react'
import * as api from '../api.js'
import {
  isSupported, isIOS, isStandalone, permission, browserTz,
  enablePush, disablePush,
} from '../push.js'
import { toast } from './Toasts.jsx'

const LEAD_OPTIONS = [10, 15, 30, 45, 60, 90]

// Pełny user agent w liście urządzeń jest nieczytelny; wystarczy rozpoznać,
// co to za sprzęt.
function shortUA(ua) {
  const s = String(ua || '')
  if (!s) return 'Nieznane urządzenie'
  if (/iPhone/.test(s)) return 'iPhone'
  if (/iPad/.test(s)) return 'iPad'
  if (/Android/.test(s)) return 'Android'
  if (/Macintosh/.test(s)) return 'Mac'
  if (/Windows/.test(s)) return 'Windows'
  return s.slice(0, 40)
}

const fmtDate = (d) => {
  const dt = new Date(d)
  return `${dt.getDate()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`
}

export default function NotifyModal({ onClose }) {
  const [prefs, setPrefs] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [perm, setPerm] = useState(permission())

  const supported = isSupported()
  // Na iOS push jest dostępny wyłącznie z ekranu początkowego — dopóki
  // aplikacja chodzi w karcie Safari, nie ma nawet jak poprosić o zgodę.
  const iosNeedsInstall = isIOS() && !isStandalone()

  const load = async () => {
    try { setPrefs(await api.push.prefs()) }
    catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const patch = async (body) => {
    setBusy(true)
    try {
      const next = await api.push.savePrefs(body)
      setPrefs((p) => ({ ...p, ...next }))
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  const turnOn = async () => {
    setBusy(true)
    try {
      // Klucz VAPID jest już w stanie (przyszedł z GET prefs), więc
      // requestPermission() wewnątrz enablePush leci bez wcześniejszego
      // awaita na sieci — inaczej Safari na iOS odrzuciłoby prośbę o zgodę.
      const { granted } = await enablePush(prefs?.vapid_public_key)
      setPerm(permission())
      if (!granted) { toast('Nie udzielono zgody na powiadomienia'); return }
      await load()
      toast('Powiadomienia włączone', 'ok')
    } catch (e) {
      toast(`Nie udało się włączyć powiadomień: ${e.message}`)
    } finally { setBusy(false) }
  }

  const turnOff = async () => {
    setBusy(true)
    try {
      await disablePush()
      await api.push.savePrefs({ enabled: false })
      await load()
      toast('Powiadomienia wyłączone', 'ok')
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  const sendTest = async () => {
    setBusy(true)
    try {
      const { sent } = await api.push.test()
      toast(`Wysłano na ${sent} urządzenie(-a)`, 'ok')
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  const forget = async (endpoint) => {
    setBusy(true)
    try { await api.push.unsubscribe({ endpoint }); await load() }
    catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  const devices = prefs?.devices || []
  const active = prefs?.enabled && devices.length > 0

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">🔔 Powiadomienia</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          {err && <div className="tp-notify-warn">{err}</div>}

          {!supported && (
            <div className="tp-notify-warn">
              Ta przeglądarka nie obsługuje powiadomień push.
            </div>
          )}

          {supported && iosNeedsInstall && (
            <div className="tp-notify-hint">
              <strong>Na iPhonie potrzebny jest jeden dodatkowy krok</strong>
              <p>Powiadomienia działają wyłącznie w aplikacji dodanej do ekranu
                 początkowego (iOS 16.4 lub nowszy).</p>
              <ol>
                <li>Otwórz tę stronę w <strong>Safari</strong> (nie w Chrome).</li>
                <li>Dotknij ikony <strong>Udostępnij</strong> na dolnym pasku.</li>
                <li>Wybierz <strong>„Dodaj do ekranu początkowego”</strong>.</li>
                <li>Uruchom TRAINstack z nowej ikony i wróć tutaj.</li>
              </ol>
            </div>
          )}

          {supported && perm === 'denied' && (
            <div className="tp-notify-warn">
              Powiadomienia zostały zablokowane w przeglądarce. Włącz je w ustawieniach
              systemowych aplikacji (iPhone: Ustawienia → Powiadomienia → TRAINstack;
              Android: Ustawienia → Aplikacje → TRAINstack → Powiadomienia), a potem wróć tutaj.
            </div>
          )}

          {prefs && supported && !iosNeedsInstall && perm !== 'denied' && (
            <div
              className={`tp-rt${active ? ' on' : ''}`}
              onClick={() => !busy && (active ? turnOff() : turnOn())}
            >
              <div className={`tp-tg${active ? ' on' : ''}`} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Przypomnienia o treningach</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {active ? 'Włączone na tym urządzeniu' : 'Dotknij, aby włączyć'}
                </div>
              </div>
            </div>
          )}

          {prefs && (
            <>
              <div className="tp-f">
                <label className="tp-lbl"><Bell size={10} /> Powiadom mnie przed treningiem</label>
                <select
                  className="tp-sel"
                  value={prefs.lead_min}
                  disabled={busy}
                  onChange={(e) => patch({ lead_min: Number(e.target.value) })}
                >
                  {LEAD_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m} minut wcześniej</option>
                  ))}
                </select>
              </div>

              <div className="tp-f">
                <label className="tp-lbl">Strefa czasowa</label>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {prefs.timezone}
                  {prefs.timezone !== browserTz() && (
                    <button
                      className="tp-btn tp-bg"
                      style={{ marginLeft: 8, padding: '3px 9px', fontSize: 11 }}
                      disabled={busy}
                      onClick={() => patch({ timezone: browserTz() })}
                    >
                      Zmień na {browserTz()}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                  Godziny treningów liczymy w tej strefie. Treningi bez ustawionej
                  godziny nie dostają przypomnień.
                </div>
              </div>

              {devices.length > 0 && (
                <div className="tp-f">
                  <label className="tp-lbl"><Smartphone size={10} /> Urządzenia ({devices.length})</label>
                  {devices.map((d) => (
                    <div key={d.endpoint} className="tp-dev-row">
                      <div>
                        <div style={{ fontSize: 13 }}>{shortUA(d.user_agent)}</div>
                        <div className="tp-dev-ua">dodane {fmtDate(d.created_at)}</div>
                      </div>
                      <button
                        className="tp-x"
                        title="Odłącz to urządzenie"
                        disabled={busy}
                        onClick={() => forget(d.endpoint)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="tp-mf">
            {devices.length > 0 && (
              <button className="tp-btn tp-bg" disabled={busy} onClick={sendTest}>
                <Send size={13} /> Wyślij testowe
              </button>
            )}
            <button className="tp-btn tp-bl" onClick={onClose}>Gotowe</button>
          </div>
        </div>
      </div>
    </div>
  )
}
