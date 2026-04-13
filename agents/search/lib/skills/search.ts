// lib/skills/search.ts
import { search as tavilySearch, TavilyError } from '../tavily'

export interface SearchInput {
  query: string
  limit?: number
}

export interface SearchOutput {
  query: string
  results: Array<{ title: string; url: string; snippet: string; score: number }>
  count: number
}

export async function search(input: unknown): Promise<SearchOutput> {
  const { query, limit } = input as SearchInput
  if (!query?.trim()) throw new Error('query is required')

  try {
    const results = await tavilySearch(query, limit ?? 5)
    return { query, results, count: results.length }
  } catch (e) {
    if (e instanceof TavilyError) throw new Error(`Search failed: ${e.message}`)
    throw e
  }
}
