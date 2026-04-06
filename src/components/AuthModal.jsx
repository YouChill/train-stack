import { useState } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await onAuth(mode, { email, password, name })
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tp-ov">
      <div className="tp-modal" style={{ maxWidth: 400 }}>
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">{mode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}</div>
          </div>

          <div className="tp-auth-tabs">
            <button
              className={`tp-auth-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => { setMode('login'); setErr('') }}
            >
              <LogIn size={13} /> Logowanie
            </button>
            <button
              className={`tp-auth-tab${mode === 'register' ? ' active' : ''}`}
              onClick={() => { setMode('register'); setErr('') }}
            >
              <UserPlus size={13} /> Rejestracja
            </button>
          </div>

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

            <div className="tp-f">
              <label className="tp-lbl">Hasło</label>
              <input
                className="tp-inp"
                type="password"
                placeholder="Min. 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {err && <div className="tp-err" style={{ marginBottom: 10 }}>{err}</div>}

            <button className="tp-btn tp-bl" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {mode === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
              {loading ? 'Ładuję...' : mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
