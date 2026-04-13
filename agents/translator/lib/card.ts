// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-translator.vercel.app',
  name: 'Translator',
  version: '1.0.0',
  description:
    'Multilingual translation and language detection agent. Translate text between 30+ languages or detect the language of any text. Powered by Gemini.',
  url: 'https://samvad-agents-translator.vercel.app',
  protocolVersion: '1.2',
  specializations: ['translation', 'language', 'multilingual'],
  models: [{ provider: 'google', model: 'gemini-2.0-flash' }],
  skills: [
    {
      id: 'translate',
      name: 'Translate',
      description: 'Translate text to a target language. Optionally specify the source language.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to translate' },
          targetLang: { type: 'string', description: 'Target language (e.g. es, fr, ja, hi, zh, de, ko, ar)' },
          sourceLang: { type: 'string', description: 'Source language (optional — auto-detected if omitted)' },
        },
        required: ['text', 'targetLang'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          translatedText: { type: 'string' },
          sourceLang: { type: 'string' },
          targetLang: { type: 'string' },
          originalText: { type: 'string' },
        },
        required: ['translatedText', 'sourceLang', 'targetLang', 'originalText'],
      },
      modes: ['sync'],
      trust: 'public',
    },
    {
      id: 'detectLanguage',
      name: 'Detect Language',
      description: 'Detect the language of a text. Returns ISO 639-1 code, language name, and confidence.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to identify' },
        },
        required: ['text'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          languageName: { type: 'string' },
          confidence: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['language', 'languageName', 'confidence'],
      },
      modes: ['sync'],
      trust: 'public',
    },
  ],
  publicKeys: [],
  auth: { schemes: ['none'] },
  rateLimit: { requestsPerMinute: 30, requestsPerSender: 10 },
  cardTTL: 3600,
  endpoints: {
    intro: '/agent/intro',
    message: '/agent/message',
    task: '/agent/task',
    taskStatus: '/agent/task/:taskId',
    stream: '/agent/stream',
    health: '/agent/health',
  },
} as AgentCard

export async function getAgentCard(): Promise<AgentCard> {
  try {
    const kp = await getKeypair()
    return {
      ...BASE_CARD,
      publicKeys: [{ kid: kp.kid, key: kp.publicKeyBase64, active: true }],
    } as AgentCard
  } catch {
    return BASE_CARD
  }
}

// Synchronous reference for protocol.ts — uses id, skills, and static fields only.
// DO NOT use for publicKeys — those are populated dynamically by getAgentCard().
export const AGENT_CARD = BASE_CARD
