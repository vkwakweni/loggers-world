import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'

interface RowMenuProps {
  label: string
  children: ReactNode
}

function RowMenu({ label, children }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="btn-icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={20} aria-hidden="true" />
      </button>
      <div
        className={open ? 'row-menu-list open' : 'row-menu-list'}
        role="menu"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </div>
  )
}

export default RowMenu
