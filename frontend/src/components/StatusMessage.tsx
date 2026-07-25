import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="status-message status-error">
      <AlertCircle size={16} aria-hidden="true" /> {children}
    </p>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="status-message status-success">
      <CheckCircle2 size={16} aria-hidden="true" /> {children}
    </p>
  )
}

export function LoadingMessage() {
  return (
    <p className="status-message status-loading">
      <Loader2 size={16} aria-hidden="true" className="spin" /> Loading...
    </p>
  )
}
