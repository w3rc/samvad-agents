// lib/groq.ts

export interface SummarizeResult {
  summary: string
  keyPoints: string[]
}

export class GroqError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqError'
  }
}

const MAX_CONTENT_CHARS = 12_000

const SYSTEM_PROMPT = `You are a research assistant. Given web page content, produce a concise structured summary.
Always respond with valid JSON in this exact shape:
{
  "summary": "2-4 sentence summary of the page",
  "keyPoints": ["point 1", "point 2", "point 3"]
}
keyPoints should have 3-7 items. No markdown, no extra fields.`

export async function summarize(
  content: string,
  title: string,
  question?: string,
): Promise<SummarizeResult> {
  const truncated = content.slice(0, MAX_CONTENT_CHARS)

  const userContent = question
    ? `Page title: ${title}\n\nFocus question: ${question}\n\nContent:\n${truncated}`
    : `Page title: ${title}\n\nContent:\n${truncated}`

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new GroqError(`Network error calling Groq: ${String(e)}`)
  }

  if (!res.ok) {
    throw new GroqError(`Groq API returned HTTP ${res.status}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices[0]?.message?.content ?? ''

  let parsed: { summary: string; keyPoints: string[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GroqError(`Model returned non-JSON response: ${raw.slice(0, 100)}`)
  }

  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.keyPoints)) {
    throw new GroqError('Model response missing required fields: summary, keyPoints')
  }

  return { summary: parsed.summary, keyPoints: parsed.keyPoints }
}
