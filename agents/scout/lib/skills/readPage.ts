// lib/skills/readPage.ts
import { fetchPage, JinaError } from '../jina'

export interface ReadPageInput {
  url: string
}

export interface ReadPageOutput {
  title: string
  content: string
  url: string
  fetchedAt: string
}

export async function readPage(input: ReadPageInput): Promise<ReadPageOutput> {
  try {
    const { title, content } = await fetchPage(input.url)
    return {
      title,
      content,
      url: input.url,
      fetchedAt: new Date().toISOString(),
    }
  } catch (e) {
    if (e instanceof JinaError) {
      throw new Error(`readPage failed: ${e.message}`)
    }
    throw e
  }
}
