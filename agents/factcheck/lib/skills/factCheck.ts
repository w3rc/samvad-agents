// lib/skills/factCheck.ts
import { callSearchAgent, SearchAgentError } from '../search-client'
import { callScoutSummarize, ScoutError } from '../scout-client'
import { getVerdict, GroqError } from '../groq'

export interface FactCheckInput {
  claim: string
  context?: string
}

export interface FactCheckOutput {
  claim: string
  confidence: number
  label: 'supported' | 'refuted' | 'disputed' | 'unverifiable'
  reasoning: string
  citations: Array<{
    url: string
    title: string
    relevance: 'supports' | 'refutes' | 'neutral'
  }>
  agentCalls: number
}

export class FactCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FactCheckError'
  }
}

const SOURCES_TO_FETCH = 3

function deriveLabel(
  confidence: number,
  direction: 'supports' | 'refutes',
  sourceCount: number,
): FactCheckOutput['label'] {
  if (sourceCount === 0) return 'unverifiable'
  if (confidence >= 0.75) return direction === 'supports' ? 'supported' : 'refuted'
  if (confidence >= 0.40) return 'disputed'
  return 'unverifiable'
}

export async function factCheck(input: unknown): Promise<FactCheckOutput> {
  if (!input || typeof input !== 'object') throw new FactCheckError('Invalid input')
  const { claim, context } = input as FactCheckInput
  if (!claim?.trim()) throw new FactCheckError('claim is required')

  let agentCalls = 0

  // 1. Search
  const searchQuery = context ? `${claim} ${context}` : claim
  let urls: string[]
  try {
    const results = await callSearchAgent(searchQuery, SOURCES_TO_FETCH)
    urls = results.map(r => r.url)
    agentCalls++
  } catch (e) {
    if (e instanceof SearchAgentError) {
      throw new FactCheckError(`Search agent unavailable: ${e.message}`)
    }
    throw e
  }

  if (urls.length === 0) {
    return {
      claim,
      confidence: 0,
      label: 'unverifiable',
      reasoning: 'No sources were found for this claim.',
      citations: [],
      agentCalls,
    }
  }

  // 2. Scout each URL concurrently (indexed to preserve deterministic ordering)
  const scoutResults: Array<{ title: string; summary: string; url: string } | null> =
    new Array(urls.length).fill(null)

  const settled = await Promise.allSettled(
    urls.map(async (url, i) => {
      const result = await callScoutSummarize(url, claim)
      scoutResults[i] = { title: result.title, summary: result.summary, url }
      agentCalls++
    })
  )

  // Re-throw any non-ScoutError failures (programming errors, network issues)
  for (const r of settled) {
    if (r.status === 'rejected' && !(r.reason instanceof ScoutError)) throw r.reason
  }

  const sources = scoutResults.filter((s): s is NonNullable<typeof s> => s !== null)

  if (sources.length === 0) {
    throw new FactCheckError('All Scout calls failed — no sources to evaluate')
  }

  // Even a single source is enough to attempt a verdict — let Groq decide confidence

  // 3. Groq verdict
  let verdict
  try {
    verdict = await getVerdict(claim, sources)
  } catch (e) {
    if (e instanceof GroqError) {
      throw new FactCheckError(`Verdict synthesis failed: ${e.message}`)
    }
    throw e
  }

  const citations: FactCheckOutput['citations'] = sources.map((s, i) => ({
    url: s.url,
    title: s.title,
    relevance: verdict.citationRelevance[i] ?? 'neutral',
  }))

  return {
    claim,
    confidence: verdict.confidence,
    label: deriveLabel(verdict.confidence, verdict.direction, sources.length),
    reasoning: verdict.reasoning,
    citations,
    agentCalls,
  }
}
