import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'

interface ThemeToggleProps {
  showLabel?: boolean
}

function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()

  return (
    <button type="button" onClick={toggle} aria-label={showLabel ? undefined : 'Toggle mode'}>
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      {showLabel && 'Toggle mode'}
    </button>
  )
}

export default ThemeToggle
