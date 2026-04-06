import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { EXAMPLE_JSON } from '../constants.js'

export default function ImportModal({ onImport, onClose }) {
  const [text, setText] = useState('')
  const [err,  setErr]  = useState('')

  const go = () => {
    try {
      const p = JSON.parse(text.trim())
      if (!p.week && !p.weeks) throw new Error('Brak klucza "week" lub "weeks"')
      onImport(p)
    } catch (e) {
      setErr('Błąd: ' + e.message)
    }
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">📁 Import planu</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-lbl" style={{ marginBottom: 5 }}>Przykład formatu JSON:</div>
          <div className="tp-imp-eg">{EXAMPLE_JSON}</div>

          <div className="tp-f">
            <label className="tp-lbl">Wklej swój plan (JSON)</label>
            <textarea
              className="tp-ta"
              style={{ minHeight: 150, fontFamily: 'monospace', fontSize: 11 }}
              placeholder="Wklej tutaj plan treningowy..."
              value={text}
              onChange={(e) => { setText(e.target.value); setErr('') }}
            />
            {err && <div className="tp-err">{err}</div>}
          </div>

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            <button className="tp-btn tp-bl" onClick={go} disabled={!text.trim()}>
              <Upload size={13} /> Importuj
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
