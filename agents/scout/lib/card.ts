// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-scout.vercel.app',
  name: 'Scout',
  version: '1.0.0',
  description:
    'Fetches and summarizes web pages. Give it a URL, get back clean readable text or a structured summary with key points.',
  url: 'https://samvad-agents-scout.vercel.app',
  protocolVersion: '1.2',
  specializations: ['web-reading', 'research', 'summarization'],
  models: [{ provider: 'groq', model: 'llama-3.3-70b-versatile' }],
  skills: [
    {
      id: 'readPage',
      name: 'Read Page',
      description: 'Fetches a URL via Jina Reader and returns the full clean text content as markdown.',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', format: 'uri' } },
        required: ['url'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          url: { type: 'string' },
          fetchedAt: { type: 'string', format: 'date-time' },
        },
        required: ['title', 'content', 'url', 'fetchedAt'],
      },
      modes: ['sync'],
      trust: 'public',
    },
    {
      id: 'summarizePage',
      name: 'Summarize Page',
      description:
        'Fetches a URL and returns a structured summary with key points. Pass an optional question to focus the summary.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          question: { type: 'string' },
        },
        required: ['url'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          keyPoints: { type: 'array', items: { type: 'string' } },
          url: { type: 'string' },
        },
        required: ['title', 'summary', 'keyPoints', 'url'],
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

export const AGENT_CARD = BASE_CARD
