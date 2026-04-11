import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPage, JinaError } from '../lib/jina'

describe('fetchPage', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns title and content on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => '# Hello World\n\nThis is the content.\n\nMore content here.',
    } as Response)

    const result = await fetchPage('https://example.com')
    expect(result.title).toBe('Hello World')
    expect(result.content).toContain('This is the content.')
  })

  it('uses url as fallback title when no heading found', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => 'No heading here, just content.',
    } as Response)

    const result = await fetchPage('https://example.com')
    expect(result.title).toBe('https://example.com')
    expect(result.content).toBe('No heading here, just content.')
  })

  it('throws JinaError on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response)
    await expect(fetchPage('https://example.com')).rejects.toBeInstanceOf(JinaError)
  })

  it('throws JinaError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))
    await expect(fetchPage('https://example.com')).rejects.toBeInstanceOf(JinaError)
  })
})
