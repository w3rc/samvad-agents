// lib/search-client.ts
// Calls Search agent's search skill over SAMVAD (lightweight mode).

const SEARCH_URL = 'https://samvad-agents-search.vercel.app/agent/message'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  score: number
}

export class SearchAgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SearchAgentError'
  }
}

export async function callSearchAgent(query: string, limit = 3): Promise<SearchResult[]> {
  let res: Response
  try {
    res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'search',
        payload: { query, limit },
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (e) {
    throw new SearchAgentError(`Network error calling Search agent: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new SearchAgentError(`Search agent returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    status: string
    result?: { results?: SearchResult[] }
  }

  if (data.status !== 'ok' || !data.result?.results) {
    throw new SearchAgentError('Search agent returned non-ok status')
  }

  return data.result.results
}
