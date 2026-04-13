// lib/tavily.ts
// Tavily search API client — returns top N URLs for a topic.

export interface TavilyResult {
  title: string
  url: string
  content: string
}

export class TavilyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TavilyError'
  }
}

export async function searchTopic(topic: string, maxResults = 3): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new TavilyError('TAVILY_API_KEY is not configured')

  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: topic,
        max_results: maxResults,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    throw new TavilyError(`Network error calling Tavily: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new TavilyError(`Tavily API returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    results?: Array<{ title?: string; url?: string; content?: string }>
  }

  return (data.results ?? [])
    .filter(r => r.url)
    .slice(0, maxResults)
    .map(r => ({
      title: r.title ?? r.url!,
      url: r.url!,
      content: r.content ?? '',
    }))
}
