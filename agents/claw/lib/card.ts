// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: Omit<AgentCard, 'publicKeys'> & { publicKeys: AgentCard['publicKeys'] } = {
  id: 'agent://samvad-agents-claw.vercel.app',
  name: 'Claw',
  version: '1.0.0',
  description:
    'An OpenClaw-powered conversational agent exposed via the SAMVAD protocol. Send it a message, get back a response from your OpenClaw instance.',
  url: 'https://samvad-agents-claw.vercel.app',
  protocolVersion: '1.2',
  specializations: ['conversation', 'assistant', 'openclaw'],
  models: [{ provider: 'openclaw', model: 'configured-in-soul' }],
  skills: [
    {
      id: 'chat',
      name: 'Chat',
      description: 'Send a message to the OpenClaw agent and get a response.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The message to send' },
          channel: { type: 'string', description: 'Optional channel identifier (default: samvad)' },
        },
        required: ['message'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          channel: { type: 'string' },
        },
        required: ['reply'],
      },
      modes: ['sync', 'async', 'stream'],
      trust: 'public',
    },
  ],
  publicKeys: [],
  auth: { schemes: ['none'] },
  rateLimit: { requestsPerMinute: 20, requestsPerSender: 5 },
  cardTTL: 3600,
  endpoints: {
    intro: '/agent/intro',
    message: '/agent/message',
    task: '/agent/task',
    taskStatus: '/agent/task/:taskId',
    stream: '/agent/stream',
    health: '/agent/health',
  },
}

// Resolve the card with the public key populated from SAMVAD_PRIVATE_KEY.
// Falls back to empty publicKeys if the key isn't configured (health still works).
export async function getAgentCard(): Promise<AgentCard> {
  try {
    const kp = await getKeypair()
    return {
      ...BASE_CARD,
      publicKeys: [{ kid: kp.kid, key: kp.publicKeyBase64, active: true }],
    } as AgentCard
  } catch {
    return BASE_CARD as AgentCard
  }
}

// Synchronous reference for protocol.ts — uses id, skills, and static fields only.
// DO NOT use for publicKeys — those are populated dynamically by getAgentCard().
export const AGENT_CARD = BASE_CARD as AgentCard
