// lib/jina.ts

export interface JinaResult {
  title: string
  content: string
}

export class JinaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JinaError'
  }
}

/**
 * Fetch a URL via Jina Reader and return clean markdown content.
 * Jina Reader is free with no API key — just prepend https://r.jina.ai/
 */
export async function fetchPage(url: string): Promise<JinaResult> {
  let res: Response
  try {
    res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (e) {
    throw new JinaError(`Network error fetching ${url}: ${String(e)}`)
  }

  if (!res.ok) {
    throw new JinaError(`HTTP ${res.status} from Jina Reader for ${url}`)
  }

  const text = await res.text()

  // Jina returns markdown with an optional `# Title` as the first heading
  const lines = text.split('\n')
  const titleLineIndex = lines.findIndex(l => l.startsWith('# '))

  let title: string
  let content: string

  if (titleLineIndex !== -1) {
    title = lines[titleLineIndex].replace(/^# /, '').trim()
    content = lines
      .filter((_, i) => i !== titleLineIndex)
      .join('\n')
      .trim()
  } else {
    title = url
    content = text.trim()
  }

  return { title, content }
}
