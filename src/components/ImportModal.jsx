import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { DAYS, UNITS, LOAD_UNITS, EXAMPLE_JSON } from '../constants.js'

const DAY_KEYS = DAYS.map((d) => d.key)

// Opisy pól pojedynczego treningu, renderowane w dokumentacji formatu poniżej.
// Dozwolone wartości (dni, dyscypliny, jednostki) celowo NIE są tu powielone —
// sekcja „Dozwolone wartości" czyta je z DAYS/UNITS/LOAD_UNITS i z aktualnej
// listy dyscyplin użytkownika, więc dokumentacja nie rozjedzie się z aplikacją.
const WORKOUT_FIELDS = [
  { name: 'discipline', req: true,  desc: 'Identyfikator dyscypliny — dokładnie jedna z wartości w sekcji „Dozwolone wartości”.' },
  { name: 'title',      req: false, desc: 'Nazwa treningu widoczna na karcie.' },
  { name: 'start_time', req: false, desc: 'Godzina rozpoczęcia w formacie "HH:MM", np. "07:30".' },
  { name: 'rest',       req: false, desc: 'true oznacza dzień odpoczynku — pozostałe pola mogą zostać puste.' },
  { name: 'params',     req: false, desc: 'Parametry treningu, np. dystans lub czas. Każdy element to {"key","value","unit"}.' },
  { name: 'exercises',  req: false, desc: 'Lista ćwiczeń. Każdy element to {"name","sets","reps","load","loadUnit"}.' },
  { name: 'notes',      req: false, desc: 'Dowolne notatki wyświetlane przy treningu.' },
]

// Klucze tygodnia muszą być dokładnie mon..sun — inaczej wpis nigdzie się nie
// wyświetli (a serwer odrzuci insert). Kilka treningów tego samego dnia to
// kilka elementów jednej tablicy, nie osobne klucze typu "thu_stretch".
function checkDays(week) {
  const bad = Object.keys(week || {}).filter((k) => !DAY_KEYS.includes(k))
  if (bad.length) {
    throw new Error(
      `nieprawidłowy dzień "${bad[0]}" — dozwolone klucze to: ${DAY_KEYS.join(', ')}. ` +
      'Kilka treningów tego samego dnia umieść jako elementy jednej tablicy.'
    )
  }
}

export default function ImportModal({ discs = [], onImport, onClose }) {
  const [text, setText] = useState('')
  const [err,  setErr]  = useState('')

  const go = () => {
    try {
      const p = JSON.parse(text.trim())
      if (!p.week && !p.weeks) throw new Error('Brak klucza "week" lub "weeks"')
      if (p.week) checkDays(p.week)
      if (p.weeks) Object.values(p.weeks).forEach(checkDays)
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

          <div className="tp-lbl" style={{ marginBottom: 5 }}>Format importu:</div>
          <div className="tp-imp-doc">
            <p className="tp-imp-intro">
              Plan to obiekt JSON z kluczem <code>"week"</code>, w którym każdy dzień
              tygodnia to <b>tablica treningów</b>. Kilka treningów tego samego dnia
              umieść jako kolejne elementy jednej tablicy — nie twórz osobnych kluczy.
            </p>

            <details className="tp-imp-sec">
              <summary>Pola treningu</summary>
              <div className="tp-imp-sec-body">
                {WORKOUT_FIELDS.map((f) => (
                  <div key={f.name} className="tp-imp-fld">
                    <code>{f.name}</code>
                    {f.req && <span className="tp-imp-req">wymagane</span>}
                    <span>{f.desc}</span>
                  </div>
                ))}
              </div>
            </details>

            <details className="tp-imp-sec">
              <summary>Dozwolone wartości</summary>
              <div className="tp-imp-sec-body">
                <div className="tp-imp-sub">Dni tygodnia — klucze wewnątrz "week"</div>
                <div className="tp-imp-chips">
                  {DAYS.map((d) => (
                    <span key={d.key} className="tp-imp-chip"><code>{d.key}</code> {d.full}</span>
                  ))}
                </div>

                {discs.length > 0 && (
                  <>
                    <div className="tp-imp-sub">Dyscypliny — pole "discipline"</div>
                    <div className="tp-imp-chips">
                      {discs.map((d) => (
                        <span key={d.id} className="tp-imp-chip">{d.icon} <code>{d.id}</code> {d.name}</span>
                      ))}
                    </div>
                  </>
                )}

                <div className="tp-imp-sub">Jednostki — pole "unit" w params</div>
                <div className="tp-imp-chips">
                  {UNITS.map((u) => <span key={u} className="tp-imp-chip"><code>{u}</code></span>)}
                </div>

                <div className="tp-imp-sub">Jednostki obciążenia — pole "loadUnit" w exercises</div>
                <div className="tp-imp-chips">
                  {LOAD_UNITS.map((u) => <span key={u} className="tp-imp-chip"><code>{u}</code></span>)}
                </div>
              </div>
            </details>

            <details className="tp-imp-sec" open>
              <summary>Przykład</summary>
              <div className="tp-imp-sec-body">
                <div className="tp-imp-eg">{EXAMPLE_JSON}</div>
              </div>
            </details>
          </div>

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
