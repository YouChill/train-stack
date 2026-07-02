import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function ConfirmDelete({ onDelete }) {
  const [arm, setArm] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const click = () => {
    if (arm) {
      clearTimeout(timer.current)
      setArm(false)
      onDelete()
      return
    }
    setArm(true)
    timer.current = setTimeout(() => setArm(false), 3000)
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
