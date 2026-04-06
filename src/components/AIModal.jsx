import { useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'

const API_URL = 'https://api.anthropic.com/v1/messages'

export default function AIModal({ discs, onImport, onClose }) {
  const [prompt,  setPrompt]  = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [err,     setErr]     = useState('')

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true); setErr(''); setPreview(null)

    try {
      const dlist = discs.map((d) => `${d.name} (id:"${d.id}")`).join(', ')

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Jesteś doświadczonym trenerem sportowym. Wygeneruj tygodniowy plan treningowy w JSON.

Dostępne dyscypliny: ${dlist}
Prośba: ${prompt}

Odpowiedz TYLKO poprawnym JSON:
{
  "week": {
    "mon": [{"discipline":"run","title":"Poranny bieg","params":[{"key":"Dystans","value":"10","unit":"km"},{"key":"Czas","value":"55","unit":"min"}],"exercises":[],"notes":"","rest":false}],
    "tue": [],
    "wed": [{"discipline":"gym","title":"Siłownia górna","params":[],"exercises":[{"name":"Bench Press","sets":"4","reps":"8","load":"80","loadUnit":"kg"}],"notes":"","rest":false}],
    "thu": [],
    "fri": [],
    "sat": [],
    "sun": [{"discipline":"run","title":"Odpoczynek","params":[],"exercises":[],"notes":"","rest":true}]
  }
}
Zasady: dni bez treningu = []. Dla biegania/pływania używaj params. Dla siłowni/boksu używaj exercises. Dostosuj do prośby. TYLKO JSON.`,
          }],
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      const raw   = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json\s*|\s*```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!parsed.week) throw new Error('Brak klucza "week"')
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
