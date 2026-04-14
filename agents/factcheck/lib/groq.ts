// lib/groq.ts

export interface VerdictResult {
  confidence: number
  direction: 'supports' | 'refutes'
  reasoning: string
  citationRelevance: Array<'supports' | 'refutes' | 'neutral'>
}

export class GroqError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqError'
  }
}

const MODEL = 'llama-3.3-70b-versatile'
const MAX_TOKENS = 512

const SYSTEM_PROMPT = `You are a fact-checking assistant. Given a claim and summaries from web sources, assess how well the evidence supports or refutes the claim.

Always respond with valid JSON in this exact shape:
{
  "confidence": 0.85,
  "direction": "supports",
  "reasoning": "2-3 sentences explaining why the evidence supports or refutes the claim.",
  "citationRelevance": ["supports", "refutes", "neutral"]
}

Rules:
- confidence: 0.0 (no evidence) to 1.0 (overwhelming evidence)
- direction: "supports" if evidence favours the claim, "refutes" if evidence contradicts it
- citationRelevance: one entry per source in the same order provided; each must be "supports", "refutes", or "neutral"
- No markdown, no extra fields`

export async function getVerdict(
  claim: string,
  sources: Array<{ title: string; summary: string; url: string }>,
): Promise<VerdictResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not configured')

  const sourcesText = sources
    .map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.summary}`)
    .join('\n\n')

  const userContent = `Claim: ${claim}\n\nSources:\n${sourcesText}`

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new GroqError(`Network error calling Groq: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new GroqError(`Groq returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new GroqError('Groq returned empty response')

  let parsed: VerdictResult
  try {
    parsed = JSON.parse(content) as VerdictResult
  } catch {
    throw new GroqError('Verdict synthesis failed: invalid JSON response')
  }

  const VALID_RELEVANCE = new Set(['supports', 'refutes', 'neutral'])

  if (
    typeof parsed.confidence !== 'number' ||
    !['supports', 'refutes'].includes(parsed.direction) ||
    typeof parsed.reasoning !== 'string' ||
    !Array.isArray(parsed.citationRelevance) ||
    parsed.citationRelevance.some((r) => !VALID_RELEVANCE.has(r))
  ) {
    throw new GroqError('Verdict synthesis failed: unexpected response shape')
  }

  return {
    ...parsed,
    confidence: Math.min(1, Math.max(0, parsed.confidence)),
  }
}
