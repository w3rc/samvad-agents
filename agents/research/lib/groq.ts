// lib/groq.ts
// Synthesis LLM — takes multiple source summaries and produces a unified research brief.

export interface SynthesisResult {
  brief: string
  keyFindings: string[]
}

export class GroqError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqError'
  }
}

const SYSTEM_PROMPT = `You are a research synthesizer. Given summaries from multiple web sources about a topic, produce a unified research brief.

You MUST respond with ONLY a valid JSON object. No prose before or after. No markdown. No code fences. Every string value MUST be properly quoted.

Respond in exactly this shape:
{"brief":"your 2-3 paragraph synthesis here","keyFindings":["specific finding 1","specific finding 2","specific finding 3"]}

Rules:
- brief: 2-3 paragraphs combining insights from all sources
- keyFindings: 3-7 items, each a specific actionable insight
- ALL string values must be double-quoted
- No trailing commas, no comments, no extra fields`

export async function synthesize(
  topic: string,
  sources: Array<{ title: string; summary: string; keyPoints: string[]; url: string }>,
): Promise<SynthesisResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not configured')

  const sourcesText = sources
    .map((s, i) => `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nSummary: ${s.summary}\nKey points: ${s.keyPoints.join('; ')}`)
    .join('\n\n')

  const userContent = `Topic: ${topic}\n\n${sourcesText}`

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new GroqError(`Network error calling Groq: ${String(e)}`)
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText)
    throw new GroqError(`Groq API returned HTTP ${res.status}: ${errBody}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices[0]?.message?.content ?? ''

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: { brief: string; keyFindings: string[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new GroqError(`Model returned non-JSON response: ${raw.slice(0, 200)}`)
  }

  if (typeof parsed.brief !== 'string' || !Array.isArray(parsed.keyFindings)) {
    throw new GroqError('Model response missing required fields: brief, keyFindings')
  }

  return { brief: parsed.brief, keyFindings: parsed.keyFindings }
}
