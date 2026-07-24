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
