// lib/skills/research.ts
// Main research skill — call Search agent → call Scout agent → synthesize.
// All inter-agent calls go over SAMVAD.

import { callSearchAgent, SearchAgentError } from '../search-client'
import { callScoutSummarize, ScoutError } from '../scout-client'
import { synthesize, GroqError } from '../groq'

export interface ResearchInput {
  topic: string
  urls?: string[]
}

export interface ResearchSource {
  url: string
  title: string
  summary: string
}

export interface ResearchOutput {
  topic: string
  brief: string
  keyFindings: string[]
  sources: ResearchSource[]
  agentCalls: number
}

export type StatusCallback = (step: string, message: string) => void

export async function research(
  input: ResearchInput,
  onStatus?: StatusCallback,
): Promise<ResearchOutput> {
  const { topic } = input
  let urls: string[]
  let agentCalls = 0

  // 1. Search via Search agent or use provided URLs
  if (input.urls && input.urls.length > 0) {
    urls = input.urls.slice(0, 3)
    onStatus?.('found', `Using ${urls.length} provided URLs`)
  } else {
    onStatus?.('calling_search', `Calling Search → search for "${topic}"...`)
    try {
      const results = await callSearchAgent(topic, 3)
      urls = results.map(r => r.url)
      agentCalls++
    } catch (e) {
      if (e instanceof SearchAgentError) throw new Error(`Search agent failed: ${e.message}`)
      throw e
    }
    onStatus?.('found', `Found ${urls.length} sources`)
  }

  if (urls.length === 0) {
    throw new Error(`No sources found for topic: ${topic}`)
  }

  // 2. Call Scout for each URL
  const sources: Array<{ title: string; summary: string; keyPoints: string[]; url: string }> = []

  for (const url of urls) {
    const shortUrl = url.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/')
    onStatus?.('calling_scout', `Calling Scout → summarizePage for ${shortUrl}...`)
    try {
      const result = await callScoutSummarize(url, topic)
      sources.push(result)
      agentCalls++
    } catch (e) {
      if (e instanceof ScoutError) {
        onStatus?.('scout_error', `Scout failed for ${shortUrl}: ${e.message}`)
        continue
      }
      throw e
    }
  }

  if (sources.length === 0) {
    throw new Error('All Scout calls failed — no sources to synthesize')
  }

  // 3. Synthesize
  onStatus?.('synthesizing', `Synthesizing ${sources.length} sources into research brief...`)

  let brief: string
  let keyFindings: string[]

  try {
    const result = await synthesize(topic, sources)
    brief = result.brief
    keyFindings = result.keyFindings
  } catch (e) {
    if (e instanceof GroqError) throw new Error(`Synthesis failed: ${e.message}`)
    throw e
  }

  onStatus?.('done', `Done — ${agentCalls} agent-to-agent calls over SAMVAD`)

  return {
    topic,
    brief,
    keyFindings,
    sources: sources.map(s => ({ url: s.url, title: s.title, summary: s.summary })),
    agentCalls,
  }
}
