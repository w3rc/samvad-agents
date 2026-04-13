// lib/skills/searchNews.ts
import { searchNews as tavilySearchNews, TavilyError } from '../tavily'

export interface SearchNewsInput {
  query: string
  days?: number
  limit?: number
}

export interface SearchNewsOutput {
  query: string
  days: number
  results: Array<{ title: string; url: string; snippet: string; score: number }>
  count: number
}

export async function searchNews(input: unknown): Promise<SearchNewsOutput> {
  const { query, days, limit } = input as SearchNewsInput
  if (!query?.trim()) throw new Error('query is required')

  const d = days ?? 7
  try {
    const results = await tavilySearchNews(query, d, limit ?? 5)
    return { query, days: d, results, count: results.length }
  } catch (e) {
    if (e instanceof TavilyError) throw new Error(`News search failed: ${e.message}`)
    throw e
  }
}
