import { BookOpen, Clapperboard, Dumbbell, Utensils, Music, Plane, Gamepad2, Coffee, Sprout, NotebookPen, type LucideIcon } from 'lucide-react'

// First keyword match wins; anything unmatched falls back to a generic icon.
const ICON_KEYWORDS: [RegExp, LucideIcon][] = [
  [/book|read|novel|library/i, BookOpen],
  [/movie|film|show|series|watch|tv/i, Clapperboard],
  [/workout|gym|run|exercise|fitness|sport/i, Dumbbell],
  [/meal|food|recipe|eat|cook|restaurant/i, Utensils],
  [/music|song|album|listen|concert/i, Music],
  [/trip|travel|flight|hike|visit/i, Plane],
  [/game|play/i, Gamepad2],
  [/coffee|tea|drink/i, Coffee],
  [/plant|garden|tree|grow/i, Sprout],
]

// Accent hues stay inside the forest palette (greens, olives, ochres, clay)
// rather than spanning the whole wheel, so cards vary without clashing.
const HUES = [140, 95, 45, 25, 170, 70]

function hash(name: string): number {
  let h = 0
  for (const char of name.toLowerCase()) h = (h * 31 + char.charCodeAt(0)) >>> 0
  return h
}

export function logTypeIcon(name: string): LucideIcon {
  return ICON_KEYWORDS.find(([pattern]) => pattern.test(name))?.[1] ?? NotebookPen
}

export function logTypeHue(name: string): number {
  return HUES[hash(name) % HUES.length]
}
