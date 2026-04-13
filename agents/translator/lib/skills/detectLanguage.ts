// lib/skills/detectLanguage.ts
import { chatCompletion, GeminiError } from '../gemini'

export interface DetectLanguageInput {
  text: string
}

export interface DetectLanguageOutput {
  language: string
  languageName: string
  confidence: string
  text: string
}

const SYSTEM_PROMPT = `You are a language detection expert. Identify the language of the given text.

Always respond with valid JSON in this exact shape:
{
  "language": "ISO 639-1 code (e.g. en, es, fr, hi, ja, zh, ar, ko, de)",
  "languageName": "full language name in English (e.g. English, Spanish, French)",
  "confidence": "high, medium, or low"
}

No extra fields. No markdown.`

export async function detectLanguage(input: unknown): Promise<DetectLanguageOutput> {
  const { text } = input as DetectLanguageInput
  if (!text?.trim()) throw new Error('text is required')

  try {
    const raw = await chatCompletion(SYSTEM_PROMPT, text)
    const parsed = JSON.parse(raw) as { language: string; languageName: string; confidence: string }

    if (!parsed.language) throw new Error('Model returned empty language')

    return {
      language: parsed.language,
      languageName: parsed.languageName ?? parsed.language,
      confidence: parsed.confidence ?? 'medium',
      text,
    }
  } catch (e) {
    if (e instanceof GeminiError) throw new Error(`Language detection failed: ${e.message}`)
    if (e instanceof SyntaxError) throw new Error('Model returned non-JSON response')
    throw e
  }
}
