// lib/tavily.ts

export interface SearchResult {
  title: string
  url: string
  snippet: string
  score: number
}

export class TavilyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TavilyError'
  }
}

export async function search(query: string, limit = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new TavilyError('TAVILY_API_KEY is not configured')

  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(limit, 10),
        include_answer: false,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    throw new TavilyError(`Network error calling Tavily: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new TavilyError(`Tavily returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    results?: Array<{ title?: string; url?: string; content?: string; score?: number }>
  }

  return (data.results ?? [])
    .filter(r => r.url)
    .map((r, i) => ({
      title: r.title ?? r.url!,
      url: r.url!,
      snippet: r.content ?? '',
      score: r.score ?? (1 - i * 0.1),
    }))
}

export async function searchNews(query: string, days = 7, limit = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new TavilyError('TAVILY_API_KEY is not configured')

  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(limit, 10),
        include_answer: false,
        topic: 'news',
        days,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    throw new TavilyError(`Network error calling Tavily: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new TavilyError(`Tavily returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    results?: Array<{ title?: string; url?: string; content?: string; score?: number }>
  }

  return (data.results ?? [])
    .filter(r => r.url)
    .map((r, i) => ({
      title: r.title ?? r.url!,
      url: r.url!,
      snippet: r.content ?? '',
      score: r.score ?? (1 - i * 0.1),
    }))
}
