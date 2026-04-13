// lib/skills/translate.ts
import { chatCompletion, GeminiError } from '../gemini'

export interface TranslateInput {
  text: string
  targetLang: string
  sourceLang?: string
}

export interface TranslateOutput {
  translatedText: string
  sourceLang: string
  targetLang: string
  originalText: string
}

const SYSTEM_PROMPT = `You are a professional translator. Translate the given text to the target language accurately and naturally. Preserve tone, formatting, and meaning.

Always respond with valid JSON in this exact shape:
{
  "translatedText": "the translated text",
  "sourceLang": "detected or provided source language code (e.g. en, es, fr, hi, ja, zh)",
  "targetLang": "target language code"
}

No extra fields. No markdown.`

export async function translate(input: unknown): Promise<TranslateOutput> {
  const { text, targetLang, sourceLang } = input as TranslateInput
  if (!text?.trim()) throw new Error('text is required')
  if (!targetLang?.trim()) throw new Error('targetLang is required')

  const userContent = sourceLang
    ? `Translate from ${sourceLang} to ${targetLang}:\n\n${text}`
    : `Translate to ${targetLang}:\n\n${text}`

  try {
    const raw = await chatCompletion(SYSTEM_PROMPT, userContent)
    const parsed = JSON.parse(raw) as { translatedText: string; sourceLang: string; targetLang: string }

    if (!parsed.translatedText) throw new Error('Model returned empty translation')

    return {
      translatedText: parsed.translatedText,
      sourceLang: parsed.sourceLang ?? sourceLang ?? 'auto',
      targetLang: parsed.targetLang ?? targetLang,
      originalText: text,
    }
  } catch (e) {
    if (e instanceof GeminiError) throw new Error(`Translation failed: ${e.message}`)
    if (e instanceof SyntaxError) throw new Error('Model returned non-JSON response')
    throw e
  }
}
