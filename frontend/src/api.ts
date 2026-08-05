export type FieldType = 'text' | 'number' | 'date'

export interface LogTypeField {
  name: string
  type: FieldType
  required: boolean
}

export interface LogType {
  typeId: string
  ownerId: string
  name: string
  fields: LogTypeField[]
  archived: boolean
}

export interface LogEntry {
  entryId: string
  typeId: string
  ownerId: string
  fields: Record<string, string | number>
  createdAt: string
}

const baseUrl = import.meta.env.VITE_FUNCTION_URL

async function apiFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return undefined

  return response.json()
}

export function createLogType(
  accessToken: string,
  name: string,
  fields: LogTypeField[],
): Promise<LogType> {
  return apiFetch('/log-types', accessToken, {
    method: 'POST',
    body: JSON.stringify({ name, fields }),
  })
}

export function listLogTypes(accessToken: string): Promise<LogType[]> {
  return apiFetch('/log-types', accessToken)
}

export function getLogType(accessToken: string, typeId: string): Promise<LogType> {
  return apiFetch(`/log-types/${typeId}`, accessToken)
}

export function archiveLogType(accessToken: string, typeId: string, archived: boolean): Promise<LogType> {
  return apiFetch(`/log-types/${typeId}/archive`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  })
}

export function deleteLogType(accessToken: string, typeId: string): Promise<void> {
  return apiFetch(`/log-types/${typeId}`, accessToken, {
    method: 'DELETE',
  })
}

export function listLogEntries(accessToken: string, typeId: string): Promise<LogEntry[]> {
  return apiFetch(`/log-types/${typeId}/entries`, accessToken)
}

export function createLogEntry(
  accessToken: string,
  typeId: string,
  fields: Record<string, string | number>,
): Promise<LogEntry> {
  return apiFetch(`/log-types/${typeId}/entries`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

export function updateLogEntry(
  accessToken: string,
  typeId: string,
  createdAt: string,
  fields: Record<string, string | number>,
): Promise<LogEntry> {
  return apiFetch(`/log-types/${typeId}/entries/${encodeURIComponent(createdAt)}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export function deleteLogEntry(accessToken: string, typeId: string, createdAt: string): Promise<void> {
  return apiFetch(`/log-types/${typeId}/entries/${encodeURIComponent(createdAt)}`, accessToken, {
    method: 'DELETE',
  })
}

export function deleteAccount(accessToken: string): Promise<void> {
  return apiFetch('/account', accessToken, {
    method: 'DELETE',
  })
}
