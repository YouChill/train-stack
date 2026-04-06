import { useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { uid } from '../utils.js'

export default function CatModal({ discs, onChange, onClose }) {
  const [ds,      setDs]      = useState(discs.map((d) => ({ ...d })))
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🏅')
  const [newClr,  setNewClr]  = useState('#60a5fa')

  const add = () => {
    if (!newName.trim()) return
    setDs((d) => [
      ...d,
      {
        id: uid(),
        name: newName.trim(),
        icon: newIcon,
        color: newClr,
        hasEx: false,
        dp: [{ key: 'Czas', value: '', unit: 'min' }],
      },
    ])
    setNewName('')
  }

  return (
    <div className="tp-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-mi">
          <div className="tp-mh">
            <div className="tp-mt">⚙️ Kategorie dyscyplin</div>
            <button className="tp-x" onClick={onClose}><X size={16} /></button>
          </div>

          <div style={{ marginBottom: 12 }}>
            {ds.map((d) => (
              <div key={d.id} className="tp-cat-item">
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <div className="tp-cdot" style={{ background: d.color }} />
                <span className="tp-cat-nm">{d.name}</span>
                <button className="tp-rm" onClick={() => setDs((x) => x.filter((i) => i.id !== d.id))}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="tp-sec">
            <div className="tp-sec-t">Nowa dyscyplina</div>
            <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 36px', gap: 6, marginBottom: 8 }}>
              <input
                className="tp-sm"
                style={{ textAlign: 'center', fontSize: 16, padding: '4px' }}
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength={2}
              />
              <input
                className="tp-sm"
                placeholder="Nazwa dyscypliny"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <input
                type="color"
                className="tp-color-in"
                value={newClr}
                onChange={(e) => setNewClr(e.target.value)}
              />
            </div>
            <button className="tp-add-r" onClick={add}><Plus size={11} /> Dodaj kategorię</button>
          </div>

          <div className="tp-mf">
            <button className="tp-btn tp-bg" onClick={onClose}>Anuluj</button>
            <button className="tp-btn tp-bl" onClick={() => { onChange(ds); onClose() }}>
              <Check size={13} /> Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
