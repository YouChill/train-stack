import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import * as api from '../api.js'

export default function ResetPasswordModal({ token, onDone, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (password !== confirm) { setErr('Hasła nie są zgodne'); return }
    if (password.length < 8) { setErr('Hasło musi mieć min. 8 znaków'); return }
    setLoading(true)
    try {
      const data = await api.auth.resetPassword({ token, password })
      onDone(data)
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
            <div className="tp-mt">Ustaw nowe hasło</div>
          </div>

          <form onSubmit={submit}>
            <div className="tp-f">
              <label className="tp-lbl">Nowe hasło</label>
              <input
                className="tp-inp"
                type="password"
                placeholder="Min. 8 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className="tp-f">
              <label className="tp-lbl">Powtórz nowe hasło</label>
              <input
                className="tp-inp"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {err && <div className="tp-err" style={{ marginBottom: 10 }}>{err}</div>}

            <button className="tp-btn tp-bl" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              <KeyRound size={13} />
              {loading ? 'Zapisuję...' : 'Ustaw hasło i zaloguj'}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12 }}>
              <button type="button" className="tp-auth-link" onClick={onCancel}>
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
