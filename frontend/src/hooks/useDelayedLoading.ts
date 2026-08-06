import { useEffect, useState } from 'react'

/**
 * Only surfaces `true` after `loading` has stayed `true` for `delay` ms, so a
 * fast request never flashes a loading indicator. Clears immediately once
 * `loading` goes false, regardless of the delay.
 */
export function useDelayedLoading(loading: boolean, delay = 200): boolean {
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShowLoading(false)
      return
    }

    const timer = setTimeout(() => setShowLoading(true), delay)
    return () => clearTimeout(timer)
  }, [loading, delay])

  return showLoading
}
