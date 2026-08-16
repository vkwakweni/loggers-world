import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { ICON_SM } from './iconSizes'

interface ThemeToggleProps {
  showLabel?: boolean
}

function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()

  return (
    <button type="button" onClick={toggle} aria-label={showLabel ? undefined : 'Toggle mode'}>
      {theme === 'dark' ? <Sun size={ICON_SM} aria-hidden="true" /> : <Moon size={ICON_SM} aria-hidden="true" />}
      {showLabel && 'Toggle mode'}
    </button>
  )
}

export default ThemeToggle
