// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-research.vercel.app',
  name: 'Research',
  version: '1.0.0',
  description:
    'Multi-agent research assistant. Give it a topic, it searches the web, calls Scout to read and summarize sources over SAMVAD, then synthesizes a structured research brief.',
  url: 'https://samvad-agents-research.vercel.app',
  protocolVersion: '1.2',
  specializations: ['research', 'synthesis', 'multi-agent'],
  models: [{ provider: 'groq', model: 'llama-3.3-70b-versatile' }],
  skills: [
    {
      id: 'research',
      name: 'Research',
      description:
        'Takes a topic, searches the web via Tavily, calls Scout over SAMVAD to summarize the top 3 sources, then synthesizes a unified research brief with key findings.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The research topic' },
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional specific URLs to research. If omitted, Tavily search finds them.',
          },
        },
        required: ['topic'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          brief: { type: 'string' },
          keyFindings: { type: 'array', items: { type: 'string' } },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                summary: { type: 'string' },
              },
            },
          },
          agentCalls: { type: 'number' },
        },
        required: ['topic', 'brief', 'keyFindings', 'sources', 'agentCalls'],
      },
      modes: ['sync', 'stream'],
      trust: 'public',
    },
  ],
  publicKeys: [],
  auth: { schemes: ['none'] },
  rateLimit: { requestsPerMinute: 10, requestsPerSender: 3 },
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
