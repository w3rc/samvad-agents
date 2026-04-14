import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/search-client', () => ({
  callSearchAgent: vi.fn(),
  SearchAgentError: class SearchAgentError extends Error {
    constructor(msg: string) { super(msg); this.name = 'SearchAgentError' }
  },
}))

vi.mock('../lib/scout-client', () => ({
  callScoutSummarize: vi.fn(),
  ScoutError: class ScoutError extends Error {
    constructor(msg: string) { super(msg); this.name = 'ScoutError' }
  },
}))

vi.mock('../lib/groq', () => ({
  getVerdict: vi.fn(),
  GroqError: class GroqError extends Error {
    constructor(msg: string) { super(msg); this.name = 'GroqError' }
  },
}))

const { factCheck, FactCheckError } = await import('../lib/skills/factCheck')
import * as searchMod from '../lib/search-client'
import * as scoutMod from '../lib/scout-client'
import * as groqMod from '../lib/groq'

const SEARCH_RESULTS = [
  { title: 'Source A', url: 'https://a.com', snippet: '...', score: 0.9 },
  { title: 'Source B', url: 'https://b.com', snippet: '...', score: 0.8 },
  { title: 'Source C', url: 'https://c.com', snippet: '...', score: 0.7 },
]

function mockScout(url: string, title: string) {
  return { title, summary: `Summary of ${title}`, keyPoints: ['point 1'], url }
}

describe('factCheck', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns "supported" when confidence ≥ 0.75 and direction is supports', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.9,
      direction: 'supports',
      reasoning: 'Strong evidence.',
      citationRelevance: ['supports', 'supports', 'neutral'],
    })

    const result = await factCheck({ claim: 'Water is wet' })
    expect(result.label).toBe('supported')
    expect(result.confidence).toBe(0.9)
    expect(result.citations).toHaveLength(3)
    expect(result.agentCalls).toBe(4) // 1 search + 3 scout
  })

  it('returns "refuted" when confidence ≥ 0.75 and direction is refutes', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.8,
      direction: 'refutes',
      reasoning: 'Evidence contradicts.',
      citationRelevance: ['refutes', 'refutes', 'neutral'],
    })

    const result = await factCheck({ claim: 'The sky is green' })
    expect(result.label).toBe('refuted')
    expect(result.confidence).toBe(0.8)
  })

  it('returns "disputed" when 0.40 ≤ confidence < 0.75', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.55,
      direction: 'supports',
      reasoning: 'Mixed evidence.',
      citationRelevance: ['supports', 'neutral', 'refutes'],
    })

    const result = await factCheck({ claim: 'Contested claim' })
    expect(result.label).toBe('disputed')
  })

  it('returns "unverifiable" when confidence < 0.40', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.2,
      direction: 'supports',
      reasoning: 'Very little evidence.',
      citationRelevance: ['neutral', 'neutral', 'neutral'],
    })

    const result = await factCheck({ claim: 'Obscure claim' })
    expect(result.label).toBe('unverifiable')
  })

  it('returns "unverifiable" with confidence 0 when only 1 Scout call succeeds', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))

    const result = await factCheck({ claim: 'Some claim' })
    expect(result.label).toBe('unverifiable')
    expect(result.confidence).toBe(0)
    expect(groqMod.getVerdict).not.toHaveBeenCalled()
  })

  it('throws FactCheckError when Search agent fails', async () => {
    vi.mocked(searchMod.callSearchAgent).mockRejectedValue(
      new searchMod.SearchAgentError('connection refused')
    )
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('throws FactCheckError when all Scout calls fail', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize).mockRejectedValue(new scoutMod.ScoutError('timeout'))
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('throws FactCheckError when Groq fails', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockRejectedValue(new groqMod.GroqError('rate limited'))
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('appends context to search query when provided', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.85,
      direction: 'supports',
      reasoning: 'Supported.',
      citationRelevance: ['supports', 'supports', 'neutral'],
    })

    await factCheck({ claim: 'Some claim', context: 'in 2024' })
    expect(searchMod.callSearchAgent).toHaveBeenCalledWith('Some claim in 2024', 3)
  })

  it('counts agentCalls correctly when 2 of 3 Scout calls succeed', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.9,
      direction: 'supports',
      reasoning: 'Supported.',
      citationRelevance: ['supports', 'supports'],
    })

    const result = await factCheck({ claim: 'Some claim' })
    expect(result.agentCalls).toBe(3) // 1 search + 2 scout successes
  })
})
