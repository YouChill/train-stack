import { useState } from 'react'
import { LogIn, UserPlus, Mail } from 'lucide-react'
import * as api from '../api.js'

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m) => { setMode(m); setErr(''); setInfo('') }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        await api.auth.requestReset({ email })
        setInfo('Jeśli konto istnieje, wysłaliśmy link do resetu hasła na podany adres email. Sprawdź skrzynkę (również spam).')
      } else {
        await onAuth(mode, { email, password, name })
      }
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Zaloguj się'
              : mode === 'register' ? 'Zarejestruj się'
              : 'Reset hasła'

  return (
    <div className="tp-ov">
      <div className="tp-modal" style={{ maxWidth: 400 }}>
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">{title}</div>
          </div>

          {mode !== 'forgot' && (
            <div className="tp-auth-tabs">
              <button
                className={`tp-auth-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => switchMode('login')}
              >
                <LogIn size={13} /> Logowanie
              </button>
              <button
                className={`tp-auth-tab${mode === 'register' ? ' active' : ''}`}
                onClick={() => switchMode('register')}
              >
                <UserPlus size={13} /> Rejestracja
              </button>
            </div>
          )}

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="tp-f">
                <label className="tp-lbl">Imię</label>
                <input
                  className="tp-inp"
                  placeholder="Jan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="tp-f">
              <label className="tp-lbl">Email</label>
              <input
                className="tp-inp"
                type="email"
                placeholder="jan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="tp-f">
                <label className="tp-lbl">Hasło</label>
                <input
                  className="tp-inp"
                  type="password"
                  placeholder="Min. 8 znaków"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}

            {err && <div className="tp-err" style={{ marginBottom: 10 }}>{err}</div>}
            {info && <div className="tp-info" style={{ marginBottom: 10, color: '#16a34a', fontSize: 13 }}>{info}</div>}

            <button className="tp-btn tp-bl" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {mode === 'login' ? <LogIn size={13} /> : mode === 'register' ? <UserPlus size={13} /> : <Mail size={13} />}
              {loading
                ? 'Ładuję...'
                : mode === 'login' ? 'Zaloguj'
                : mode === 'register' ? 'Zarejestruj'
                : 'Wyślij link resetujący'}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12 }}>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}
                >
                  Zapomniałem hasła
                </button>
              )}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}
                >
                  ← Powrót do logowania
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
