// lib/scout-client.ts
// Calls Scout's summarizePage skill over SAMVAD (lightweight mode).

const SCOUT_URL = 'https://samvad-agents-scout.vercel.app/agent/message'

export interface ScoutSummary {
  title: string
  summary: string
  keyPoints: string[]
  url: string
}

export class ScoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoutError'
  }
}

export async function callScoutSummarize(url: string, question: string): Promise<ScoutSummary> {
  let res: Response
  try {
    res = await fetch(SCOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'summarizePage',
        payload: { url, question },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new ScoutError(`Network error calling Scout for ${url}: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ScoutError(`Scout returned HTTP ${res.status} for ${url}: ${text}`)
  }

  const data = await res.json() as {
    status: string
    result?: { title?: string; summary?: string; keyPoints?: string[]; url?: string }
  }

  if (data.status !== 'ok' || !data.result) {
    throw new ScoutError(`Scout returned non-ok status for ${url}`)
  }

  return {
    title: data.result.title ?? url,
    summary: data.result.summary ?? '',
    keyPoints: data.result.keyPoints ?? [],
    url: data.result.url ?? url,
  }
}
