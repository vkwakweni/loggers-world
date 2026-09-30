import { NetworkError } from './api'

export interface ChorusBucket {
  value: string
  count: number
}

export interface ChorusDimension {
  name: string
  buckets: ChorusBucket[]
}

export interface ChorusStats {
  range: { from: string; to: string }
  totalEntries: number
  dimensions: ChorusDimension[]
}

export interface ChorusConsent {
  granted: boolean
  grantedAt?: string | null
}

export interface ChorusAnswer {
  answer: string
  dataUsed: {
    statsQueried: string[]
    range: { from: string; to: string }
  }
}

// Empty or unset means Turaco Chorus isn't wired up for this build, and
// every Chorus surface in the UI hides itself.
const baseUrl: string | undefined = import.meta.env.VITE_CHORUS_URL

export const isChorusEnabled = Boolean(baseUrl)

export class ConsentRequiredError extends Error {
  constructor() {
    super('Consent has not been granted')
    this.name = 'ConsentRequiredError'
  }
}

async function chorusFetch<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    })
  } catch {
    throw new NetworkError()
  }

  if (response.status === 403) throw new ConsentRequiredError()

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Turaco Chorus returned ${response.status}`)
  }

  return response.json()
}

// `from`/`to` are inclusive `YYYY-MM-DD` bounds; omit both for all time.
export function getStats(accessToken: string, range?: { from: string; to: string }): Promise<ChorusStats> {
  const query = range ? `?from=${range.from}&to=${range.to}` : ''
  return chorusFetch(`/stats${query}`, accessToken)
}

export function getConsent(accessToken: string): Promise<ChorusConsent> {
  return chorusFetch('/consent', accessToken)
}

export function setConsent(accessToken: string, granted: boolean): Promise<ChorusConsent> {
  return chorusFetch('/consent', accessToken, {
    method: 'PUT',
    body: JSON.stringify({ granted }),
  })
}

export function ask(accessToken: string, question: string): Promise<ChorusAnswer> {
  return chorusFetch('/ask', accessToken, {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}
