// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-search.vercel.app',
  name: 'Web Search',
  version: '1.0.0',
  description:
    'Web search agent. Give it a query, get back ranked results with titles, snippets, and URLs. Supports general search and news search.',
  url: 'https://samvad-agents-search.vercel.app',
  protocolVersion: '1.2',
  specializations: ['search', 'web', 'news'],
  models: [{ provider: 'tavily', model: 'search-api' }],
  skills: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search the web for a query. Returns ranked results with title, URL, snippet, and relevance score.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          limit: { type: 'number', description: 'Max results (default 5, max 10)' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' },
                score: { type: 'number' },
              },
            },
          },
          count: { type: 'number' },
        },
        required: ['query', 'results', 'count'],
      },
      modes: ['sync'],
      trust: 'public',
    },
    {
      id: 'searchNews',
      name: 'Search News',
      description: 'Search recent news for a query. Returns ranked results from the last N days.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The news search query' },
          days: { type: 'number', description: 'How many days back to search (default 7)' },
          limit: { type: 'number', description: 'Max results (default 5, max 10)' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          days: { type: 'number' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' },
                score: { type: 'number' },
              },
            },
          },
          count: { type: 'number' },
        },
        required: ['query', 'days', 'results', 'count'],
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
