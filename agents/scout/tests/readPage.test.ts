import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/jina', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/jina')>()
  return { ...actual, fetchPage: vi.fn() }
})

const { readPage } = await import('../lib/skills/readPage')
import * as jinaMod from '../lib/jina'

describe('readPage', () => {
  it('returns title, content, url, fetchedAt on success', async () => {
    vi.mocked(jinaMod.fetchPage).mockResolvedValue({
      title: 'Hello World',
      content: 'Great content here.',
    })

    const result = await readPage({ url: 'https://example.com' })
    expect(result.title).toBe('Hello World')
    expect(result.content).toBe('Great content here.')
    expect(result.url).toBe('https://example.com')
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('throws Error when fetchPage throws JinaError', async () => {
    vi.mocked(jinaMod.fetchPage).mockRejectedValue(
      new jinaMod.JinaError('HTTP 404'),
    )
    await expect(readPage({ url: 'https://bad.com' })).rejects.toThrow('HTTP 404')
  })
})
