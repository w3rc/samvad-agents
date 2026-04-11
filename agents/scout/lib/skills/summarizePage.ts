// lib/skills/summarizePage.ts
import { fetchPage, JinaError } from '../jina'
import { summarize, GroqError } from '../groq'

export interface SummarizePageInput {
  url: string
  question?: string
}

export interface SummarizePageOutput {
  title: string
  summary: string
  keyPoints: string[]
  url: string
}

export async function summarizePage(input: SummarizePageInput): Promise<SummarizePageOutput> {
  let title: string
  let content: string

  try {
    const result = await fetchPage(input.url)
    title = result.title
    content = result.content
  } catch (e) {
    if (e instanceof JinaError) {
      throw new Error(`summarizePage fetch failed: ${e.message}`)
    }
    throw e
  }

  let summary: string
  let keyPoints: string[]

  try {
    const result = await summarize(content, title, input.question)
    summary = result.summary
    keyPoints = result.keyPoints
  } catch (e) {
    if (e instanceof GroqError) {
      throw new Error(`summarizePage LLM failed: ${e.message}`)
    }
    throw e
  }

  return { title, summary, keyPoints, url: input.url }
}
