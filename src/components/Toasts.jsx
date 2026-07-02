import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

let push = null

export function toast(msg, type = 'error') {
  if (push) push(msg, type)
  else console.error('[toast]', msg)
}

export default function Toasts() {
  const [items, setItems] = useState([])

  useEffect(() => {
    push = (msg, type) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, msg, type }])
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000)
    }
    return () => { push = null }
  }, [])

  if (!items.length) return null

  return (
    <div className="tp-toasts">
      {items.map((t) => (
        <div key={t.id} className={`tp-toast ${t.type}`}>
          {t.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{t.msg}</span>
          <button className="tp-toast-x" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
