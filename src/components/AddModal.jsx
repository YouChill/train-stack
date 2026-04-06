import { useState } from 'react'
import { Check, Minus, Plus, X } from 'lucide-react'
import { DAYS, UNITS, LOAD_UNITS } from '../constants.js'

export default function AddModal({ targetDay, workout, discs, onSave, onClose }) {
  const initDisc = workout?.discipline || discs[0]?.id || ''

  const [discId, setDiscId] = useState(initDisc)
  const [title,  setTitle]  = useState(workout?.title  || '')
  const [notes,  setNotes]  = useState(workout?.notes  || '')
  const [rest,   setRest]   = useState(workout?.rest   || false)
  const [day,    setDay]    = useState(workout?.day    || targetDay || 'mon')

  const [params, setParams] = useState(() => {
    if (workout?.params?.length) return workout.params.map((p) => ({ ...p }))
    return (discs.find((d) => d.id === initDisc)?.dp || []).map((p) => ({ ...p }))
  })

  const [exs, setExs] = useState(() =>
    workout?.exercises ? workout.exercises.map((e) => ({ ...e })) : []
  )

  const disc = discs.find((d) => d.id === discId) || discs[0]

  const changeDisc = (id) => {
    setDiscId(id)
    if (!workout) {
      const d = discs.find((x) => x.id === id)
      setParams((d?.dp || []).map((p) => ({ ...p })))
      setExs([])
    }
  }

  const setP = (i, f, v) => setParams((ps) => ps.map((p, j) => (j === i ? { ...p, [f]: v } : p)))
  const addP = () => setParams((ps) => [...ps, { key: '', value: '', unit: 'min' }])
  const delP = (i) => setParams((ps) => ps.filter((_, j) => j !== i))

  const setE = (i, f, v) => setExs((es) => es.map((e, j) => (j === i ? { ...e, [f]: v } : e)))
  const addE = () => setExs((es) => [...es, { name: '', sets: '', reps: '', load: '', loadUnit: 'kg' }])
  const delE = (i) => setExs((es) => es.filter((_, j) => j !== i))

  const save = () =>
    onSave({
      ...workout,
      id: workout?.id,
      day,
      discipline: discId,
      title: title || disc?.name || '',
      notes,
      params: params.filter((p) => p.key || p.value),
      exercises: exs.filter((e) => e.name),
      rest,
      done: workout?.done || false,
    })

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">{workout ? 'Edytuj trening' : 'Nowy trening'}</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          {!workout && (
            <div className="tp-f">
              <label className="tp-lbl">Dzień tygodnia</label>
              <select className="tp-sel" value={day} onChange={(e) => setDay(e.target.value)}>
                {DAYS.map((d) => <option key={d.key} value={d.key}>{d.full}</option>)}
              </select>
            </div>
          )}

          <div className={`tp-rt${rest ? ' on' : ''}`} onClick={() => setRest((r) => !r)}>
            <div className={`tp-tg${rest ? ' on' : ''}`} />
            <span style={{ fontSize: 13, color: rest ? '#9090c0' : '#303050' }}>
              {rest ? '🌙 Dzień odpoczynku' : 'Oznacz jako dzień odpoczynku'}
            </span>
          </div>

          {!rest && (
            <>
              <div className="tp-f">
                <label className="tp-lbl">Dyscyplina</label>
                <div className="tp-dg">
                  {discs.map((d) => (
                    <div
                      key={d.id}
                      className={`tp-db${discId === d.id ? ' sel' : ''}`}
                      style={{ '--dc': d.color }}
                      onClick={() => changeDisc(d.id)}
                    >
                      <div className="tp-db-ic">{d.icon}</div>
                      <div className="tp-db-nm">{d.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tp-f">
                <label className="tp-lbl">Nazwa treningu</label>
                <input
                  className="tp-inp"
                  placeholder={disc?.name || 'Np. Poranny bieg'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="tp-sec">
                <div className="tp-sec-t">📊 Parametry</div>
                {params.map((p, i) => (
                  <div key={i} className="tp-pr">
                    <input className="tp-sm" placeholder="Nazwa" value={p.key}
                      onChange={(e) => setP(i, 'key', e.target.value)} />
                    <input className="tp-sm" placeholder="Wartość" value={p.value}
                      onChange={(e) => setP(i, 'value', e.target.value)} />
                    <select className="tp-sm" value={p.unit}
                      onChange={(e) => setP(i, 'unit', e.target.value)}>
                      {[...new Set([...UNITS, p.unit])].map((u) => <option key={u}>{u}</option>)}
                    </select>
                    <button className="tp-rm" onClick={() => delP(i)}><Minus size={12} /></button>
                  </div>
                ))}
                <button className="tp-add-r" onClick={addP}><Plus size={11} /> Dodaj parametr</button>
              </div>

              {(disc?.hasEx || exs.length > 0) && (
                <div className="tp-sec">
                  <div className="tp-sec-t">💪 Ćwiczenia</div>
                  {exs.length > 0 && (
                    <div className="tp-eh">
                      {['Ćwiczenie', 'Serie', 'Powt.', 'Obciąż.', 'Jednostka', ''].map((h, i) => (
                        <div key={i} className="tp-clbl">{h}</div>
                      ))}
                    </div>
                  )}
                  {exs.map((ex, i) => (
                    <div key={i} className="tp-er">
                      <input className="tp-sm" placeholder="Bench Press" value={ex.name}
                        onChange={(e) => setE(i, 'name', e.target.value)} />
                      <input className="tp-sm" placeholder="4" value={ex.sets}
                        onChange={(e) => setE(i, 'sets', e.target.value)} />
                      <input className="tp-sm" placeholder="8" value={ex.reps}
                        onChange={(e) => setE(i, 'reps', e.target.value)} />
                      <input className="tp-sm" placeholder="80" value={ex.load}
                        onChange={(e) => setE(i, 'load', e.target.value)} />
                      <select className="tp-sm" value={ex.loadUnit}
                        onChange={(e) => setE(i, 'loadUnit', e.target.value)}>
                        {LOAD_UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                      <button className="tp-rm" onClick={() => delE(i)}><Minus size={12} /></button>
                    </div>
                  ))}
                  <button className="tp-add-r" onClick={addE}><Plus size={11} /> Dodaj ćwiczenie</button>
                </div>
              )}

              <div className="tp-f">
                <label className="tp-lbl">Notatki</label>
                <textarea
                  className="tp-ta"
                  placeholder="Uwagi, wskazówki, odczucia..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            <button className="tp-btn tp-bl" onClick={save}>
              <Check size={13} /> {workout ? 'Zapisz zmiany' : 'Dodaj trening'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
