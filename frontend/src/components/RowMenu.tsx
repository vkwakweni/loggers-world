import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { useDismissableMenu } from '../hooks/useDismissableMenu'
import { ICON_MD } from '../iconSizes'

interface RowMenuProps {
  label: string
  children: ReactNode
}

function RowMenu({ label, children }: RowMenuProps) {
  const { open, setOpen, ref } = useDismissableMenu<HTMLDivElement>()

  return (
    <div className="row-actions">
      <div className="row-actions-inline">{children}</div>
      <div className="row-menu" ref={ref}>
        <button
          type="button"
          className="btn-icon"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <MoreVertical size={ICON_MD} aria-hidden="true" />
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
    </div>
  )
}

export default RowMenu
