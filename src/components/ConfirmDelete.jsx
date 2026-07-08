import { useEffect, useRef, useState } from 'react'
import { Repeat, Trash2 } from 'lucide-react'

export default function ConfirmDelete({ onDelete, onDeleteSeries }) {
  const [arm, setArm] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const disarm = () => { clearTimeout(timer.current); setArm(false) }

  const click = () => {
    if (arm) {
      disarm()
      onDelete()
      return
    }
    setArm(true)
    timer.current = setTimeout(() => setArm(false), onDeleteSeries ? 5000 : 3000)
  }

  // Trening cykliczny: po uzbrojeniu wybór — jedno wystąpienie albo cała seria
  if (arm && onDeleteSeries) {
    return (
      <span style={{ display: 'inline-flex', gap: 4 }}>
        <button className="tp-ca dl confirm" title="Usuń tylko to wystąpienie" onClick={click}>
          <Trash2 size={14} />
          <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 3, whiteSpace: 'nowrap' }}>Jedno</span>
        </button>
        <button
          className="tp-ca dl confirm"
          title="Usuń to i wszystkie kolejne wystąpienia serii"
          onClick={() => { disarm(); onDeleteSeries() }}
        >
          <Repeat size={12} />
          <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 3, whiteSpace: 'nowrap' }}>Serię</span>
        </button>
      </span>
    )
  }

  return (
    <button
      className={`tp-ca dl${arm ? ' confirm' : ''}`}
      title={arm ? 'Kliknij ponownie, aby usunąć' : 'Usuń'}
      onClick={click}
    >
      <Trash2 size={14} />
      {arm && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 3 }}>Usunąć?</span>}
    </button>
  )
}
