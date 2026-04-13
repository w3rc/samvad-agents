// lib/gemini.ts
// Gemini AI Studio client — uses the OpenAI-compatible endpoint.

export class GeminiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiError'
  }
}

export async function chatCompletion(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY is not configured')

  let res: Response
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new GeminiError(`Network error calling Gemini: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new GeminiError(`Gemini API returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}
