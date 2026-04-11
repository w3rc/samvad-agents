import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { summarize, GroqError } from '../lib/groq'

const mockGroqResponse = (content: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content } }],
  }),
})

describe('summarize', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.GROQ_API_KEY = 'test-key'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GROQ_API_KEY
  })

  it('returns summary and keyPoints from model output', async () => {
    const modelOutput = JSON.stringify({
      summary: 'A great article about TypeScript.',
      keyPoints: ['TypeScript adds types', 'It compiles to JS', 'Wide adoption'],
    })
    vi.mocked(fetch).mockResolvedValue(mockGroqResponse(modelOutput) as Response)

    const result = await summarize('Long article content...', 'TypeScript Guide')
    expect(result.summary).toBe('A great article about TypeScript.')
    expect(result.keyPoints).toHaveLength(3)
  })

  it('includes question focus in prompt when provided', async () => {
    const modelOutput = JSON.stringify({
      summary: 'Focused on performance.',
      keyPoints: ['Fast rendering'],
    })
    vi.mocked(fetch).mockResolvedValue(mockGroqResponse(modelOutput) as Response)

    await summarize('Content...', 'React Perf', 'What makes React fast?')
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user').content
    expect(userMsg).toContain('What makes React fast?')
  })

  it('truncates content longer than 12000 chars', async () => {
    const longContent = 'x'.repeat(20_000)
    const modelOutput = JSON.stringify({ summary: 'ok', keyPoints: [] })
    vi.mocked(fetch).mockResolvedValue(mockGroqResponse(modelOutput) as Response)

    await summarize(longContent, 'Title')
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user').content
    expect(userMsg.length).toBeLessThan(15_000)
  })

  it('throws GroqError on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response)
    await expect(summarize('content', 'title')).rejects.toBeInstanceOf(GroqError)
  })

  it('throws GroqError when model returns malformed JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(mockGroqResponse('not json at all') as Response)
    await expect(summarize('content', 'title')).rejects.toBeInstanceOf(GroqError)
  })
})
