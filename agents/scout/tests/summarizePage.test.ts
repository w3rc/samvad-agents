import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/jina', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/jina')>()
  return { ...actual, fetchPage: vi.fn() }
})

vi.mock('../lib/groq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/groq')>()
  return { ...actual, summarize: vi.fn() }
})

const { summarizePage } = await import('../lib/skills/summarizePage')
import * as jinaMod from '../lib/jina'
import * as groqMod from '../lib/groq'

describe('summarizePage', () => {
  it('returns title, summary, keyPoints, url on success', async () => {
    vi.mocked(jinaMod.fetchPage).mockResolvedValue({ title: 'My Page', content: 'Content.' })
    vi.mocked(groqMod.summarize).mockResolvedValue({
      summary: 'Great page.',
      keyPoints: ['Point 1', 'Point 2'],
    })

    const result = await summarizePage({ url: 'https://example.com' })
    expect(result.title).toBe('My Page')
    expect(result.summary).toBe('Great page.')
    expect(result.keyPoints).toEqual(['Point 1', 'Point 2'])
    expect(result.url).toBe('https://example.com')
  })

  it('passes question to summarize when provided', async () => {
    vi.mocked(jinaMod.fetchPage).mockResolvedValue({ title: 'T', content: 'C' })
    vi.mocked(groqMod.summarize).mockResolvedValue({ summary: 'ok', keyPoints: [] })

    await summarizePage({ url: 'https://example.com', question: 'What is the main point?' })
    expect(groqMod.summarize).toHaveBeenCalledWith('C', 'T', 'What is the main point?')
  })

  it('throws Error when fetchPage throws JinaError', async () => {
    vi.mocked(jinaMod.fetchPage).mockRejectedValue(new jinaMod.JinaError('unreachable'))
    await expect(summarizePage({ url: 'https://bad.com' })).rejects.toThrow('unreachable')
  })

  it('throws Error when summarize throws GroqError', async () => {
    vi.mocked(jinaMod.fetchPage).mockResolvedValue({ title: 'T', content: 'C' })
    vi.mocked(groqMod.summarize).mockRejectedValue(new groqMod.GroqError('rate limited'))
    await expect(summarizePage({ url: 'https://example.com' })).rejects.toThrow('rate limited')
  })
})
