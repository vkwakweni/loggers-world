import { WifiOff } from 'lucide-react'

function OfflineMessage() {
  return (
    <div className="offline-state" role="alert">
      <WifiOff size={48} aria-hidden="true" />
      <h1>You're offline</h1>
      <p>Check your internet connection. This page will reload automatically once you're back online.</p>
    </div>
  )
}

export default OfflineMessage
