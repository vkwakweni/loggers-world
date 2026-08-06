import { useEffect } from 'react'

/**
 * Calls `retry` whenever the browser's `online` event fires. Used to
 * automatically recover from a NetworkError once connectivity returns,
 * without the user having to manually refresh or click a button.
 */
export function useOnlineRetry(retry: () => void) {
  useEffect(() => {
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [retry])
}
