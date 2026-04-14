import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

process.env.GROQ_API_KEY = 'test-key'

const { getVerdict, GroqError } = await import('../lib/groq')

const SOURCES = [
  { title: 'Source A', summary: 'Summary A', url: 'https://a.com' },
  { title: 'Source B', summary: 'Summary B', url: 'https://b.com' },
]

const VALID_GROQ_RESPONSE = {
  confidence: 0.85,
  direction: 'supports',
  reasoning: 'Evidence supports the claim.',
  citationRelevance: ['supports', 'neutral'],
}

describe('getVerdict', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns verdict on valid Groq response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(VALID_GROQ_RESPONSE) } }],
      }),
    })

    const result = await getVerdict('Water is wet', SOURCES)
    expect(result.confidence).toBe(0.85)
    expect(result.direction).toBe('supports')
    expect(result.reasoning).toBe('Evidence supports the claim.')
    expect(result.citationRelevance).toEqual(['supports', 'neutral'])
  })

  it('throws GroqError on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError on invalid JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json at all' } }],
      }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError on empty choices', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError when response shape is unexpected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ wrong: 'shape' }) } }],
      }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })
})
