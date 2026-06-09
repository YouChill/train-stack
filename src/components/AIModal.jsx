import { useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import * as api from '../api.js'

export default function AIModal({ discs, onImport, onClose }) {
  const [prompt,  setPrompt]  = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [err,     setErr]     = useState('')

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true); setErr(''); setPreview(null)

    try {
      const parsed = await api.ai.generate({
        prompt: prompt.trim(),
        disciplines: discs.map((d) => ({ id: d.id, name: d.name })),
      })
      setPreview(parsed)
    } catch (e) {
      setErr('Błąd: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">✨ Generuj plan z AI</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-ai-box">
            <div className="tp-ai-hint">
              Opisz cel, poziom zaawansowania i preferencje — AI wygeneruje kompletny plan
              tygodniowy uwzględniając dyscypliny: {discs.map((d) => d.icon + d.name).join(', ')}.
            </div>
          </div>

          <div className="tp-f">
            <label className="tp-lbl">Opisz swój plan</label>
            <textarea
              className="tp-ta"
              style={{ minHeight: 100 }}
              placeholder='Np. "Przygotowanie do półmaratonu, 12 tygodni, biegam 3× w tygodniu, 1× siłownia, poziom średniozaawansowany."'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {loading && (
            <div className="tp-loading">
              <div className="tp-spinner" />
              <p>AI generuje Twój plan treningowy...</p>
            </div>
          )}

          {err && <div className="tp-err" style={{ marginBottom: 11 }}>{err}</div>}

          {preview && !loading && (
            <>
              <div className="tp-lbl" style={{ marginBottom: 5 }}>Podgląd planu:</div>
              <div className="tp-prev">{JSON.stringify(preview, null, 2)}</div>
            </>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            {!preview ? (
              <button className="tp-btn tp-bp" onClick={generate} disabled={!prompt.trim() || loading}>
                <Sparkles size={13} /> {loading ? 'Generuję...' : 'Generuj plan'}
              </button>
            ) : (
              <>
                <button className="tp-btn tp-bg" onClick={() => setPreview(null)}>Nowy plan</button>
                <button className="tp-btn tp-bl" onClick={() => onImport(preview)}>
                  <Check size={13} /> Zastosuj plan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
