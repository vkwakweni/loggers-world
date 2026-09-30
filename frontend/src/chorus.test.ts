import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
async function loadClient() {
  vi.resetModules()
  vi.stubEnv('VITE_CHORUS_URL', 'http://chorus.test')
  return import('./chorus')
}

function respond(status: number, body: unknown) {
  return vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }))
}

describe('chorus client', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => vi.unstubAllEnvs())

  it('is disabled when no URL is configured', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CHORUS_URL', '')
    expect((await import('./chorus')).isChorusEnabled).toBe(false)
  })

  it('sends the bearer token and question to /ask', async () => {
    const { ask, isChorusEnabled } = await loadClient()
    const fetchMock = respond(200, { answer: 'Four.', dataUsed: { statsQueried: [], range: { from: 'a', to: 'b' } } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await ask('tok', 'how many?')

    expect(isChorusEnabled).toBe(true)
    expect(result.answer).toBe('Four.')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://chorus.test/ask')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(init.body).toBe(JSON.stringify({ question: 'how many?' }))
  })

  it('passes a date range to /stats as query bounds', async () => {
    const { getStats } = await loadClient()
    const fetchMock = respond(200, { range: { from: 'a', to: 'b' }, totalEntries: 0, dimensions: [] })
    vi.stubGlobal('fetch', fetchMock)

    await getStats('tok', { from: '2026-09-01', to: '2026-09-07' })
    await getStats('tok')

    expect(fetchMock.mock.calls[0][0]).toBe('http://chorus.test/stats?from=2026-09-01&to=2026-09-07')
    expect(fetchMock.mock.calls[1][0]).toBe('http://chorus.test/stats')
  })

  it('puts consent as a boolean body', async () => {
    const { setConsent } = await loadClient()
    const fetchMock = respond(200, { granted: true })
    vi.stubGlobal('fetch', fetchMock)

    await setConsent('tok', true)

    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ granted: true }))
  })

  it('maps 403 to ConsentRequiredError', async () => {
    const { ask, ConsentRequiredError } = await loadClient()
    vi.stubGlobal('fetch', respond(403, {}))
    await expect(ask('tok', 'q')).rejects.toBeInstanceOf(ConsentRequiredError)
  })

  it('surfaces the server error message', async () => {
    const { getStats } = await loadClient()
    vi.stubGlobal('fetch', respond(500, { error: 'An unexpected error occurred.' }))
    await expect(getStats('tok')).rejects.toThrow('An unexpected error occurred.')
  })

  it('maps fetch failure to NetworkError', async () => {
    const { getConsent } = await loadClient()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(getConsent('tok')).rejects.toMatchObject({ name: 'NetworkError' })
  })
})
