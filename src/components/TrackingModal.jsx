import { useState } from 'react'
import { Clock, Save, X } from 'lucide-react'

const FEELINGS = [
  { v: 1, label: 'Fatalnie', icon: '😫' },
  { v: 2, label: 'Ciężko',   icon: '😓' },
  { v: 3, label: 'OK',       icon: '😐' },
  { v: 4, label: 'Dobrze',   icon: '💪' },
  { v: 5, label: 'Świetnie', icon: '🔥' },
]

export default function TrackingModal({ workout, discs, onSave, onClose }) {
  const disc = discs.find((d) => d.id === workout.discipline) || discs[0]

  const [feeling, setFeeling] = useState(3)
  const [note, setNote] = useState('')

  const save = () => {
    onSave({
      workout_id: workout.id,
      feeling,
      note,
      actual_params: [],
      actual_exercises: [],
    })
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal tp-modal-w">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">Zapisz trening</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="tp-track-info">
            <div className="tp-card-badge" style={{ background: disc.color + '22', color: disc.color }}>
              <span>{disc.icon}</span> <span>{disc.name}</span>
            </div>
            <span className="tp-track-title">{workout.title || disc.name}</span>
            {workout.start_time && <span className="tp-card-time"><Clock size={9} /> {workout.start_time}</span>}
          </div>

          <div className="tp-f">
            <label className="tp-lbl">Samopoczucie</label>
            <div className="tp-feelings">
              {FEELINGS.map((f) => (
                <button
                  key={f.v}
                  className={`tp-feel${feeling === f.v ? ' sel' : ''}`}
                  onClick={() => setFeeling(f.v)}
                >
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span className="tp-feel-lbl">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tp-f">
            <label className="tp-lbl">Notatki z treningu</label>
            <textarea
              className="tp-ta"
              placeholder="Jak poszło? Co zmienić następnym razem?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            <button className="tp-btn tp-bl" onClick={save}>
              <Save size={13} /> Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
