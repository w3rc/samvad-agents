// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-factcheck.vercel.app',
  name: 'FactCheck',
  version: '1.0.0',
  description:
    'Checks claims against live web sources. Returns a confidence score, verdict label (supported / refuted / disputed / unverifiable), reasoning, and citations.',
  url: 'https://samvad-agents-factcheck.vercel.app',
  protocolVersion: '1.2',
  specializations: ['fact-checking', 'research', 'verification'],
  models: [{ provider: 'groq', model: 'llama-3.3-70b-versatile' }],
  skills: [
    {
      id: 'factCheck',
      name: 'Fact Check',
      description:
        'Checks a claim against live web sources. Calls the Search agent and Scout agent over SAMVAD, then synthesizes a verdict with Groq.',
      inputSchema: {
        type: 'object',
        properties: {
          claim: { type: 'string', description: 'The statement to verify.' },
          context: { type: 'string', description: 'Optional background to sharpen search queries.' },
        },
        required: ['claim'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          label: { type: 'string', enum: ['supported', 'refuted', 'disputed', 'unverifiable'] },
          reasoning: { type: 'string' },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                relevance: { type: 'string', enum: ['supports', 'refutes', 'neutral'] },
              },
              required: ['url', 'title', 'relevance'],
            },
          },
          agentCalls: { type: 'number' },
        },
        required: ['claim', 'confidence', 'label', 'reasoning', 'citations', 'agentCalls'],
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
