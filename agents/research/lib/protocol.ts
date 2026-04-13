// lib/protocol.ts
// SAMVAD protocol verification pipeline for incoming requests.
// Order: envelope parse → nonce+timestamp → rate limit → signature verify → trust tier

import { NextResponse } from 'next/server'
import { NonceStore, verifyRequest, decodePublicKey } from '@samvad-protocol/sdk'
import type { MessageEnvelope, RequestSignatureHeaders, PublicKey } from '@samvad-protocol/sdk'
import { checkRateLimit } from './rate-limiter'
import { AGENT_CARD } from './card'
import { randomUUID } from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Digest, Signature-Input, Signature',
}

// 5-minute nonce window.
// LIMITATION: On Vercel serverless, each instance has its own NonceStore.
// A replay hitting a different instance will not be detected. For production
// hardening, replace with Upstash Redis (SET nonce EX 300 NX).
const nonceStore = new NonceStore(5 * 60 * 1000)

// Cache of remote agent public keys: agent:// ID → PublicKey[]
const peerKeyCache = new Map<string, { keys: PublicKey[]; fetchedAt: number }>()
const PEER_CACHE_TTL_MS = 5 * 60 * 1000

async function fetchPeerKeys(agentUrl: string): Promise<PublicKey[]> {
  // Derive card URL from agent:// ID using proper URL parsing
  // agent://example.com → https://example.com/.well-known/agent.json
  // agent://example.com/sub → https://example.com/.well-known/agent.json (origin only)
  const origin = new URL(agentUrl.replace('agent://', 'https://')).origin
  const cardUrl = `${origin}/.well-known/agent.json`
  const cached = peerKeyCache.get(agentUrl)
  if (cached && Date.now() - cached.fetchedAt < PEER_CACHE_TTL_MS) return cached.keys

  try {
    const res = await fetch(cardUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const card = await res.json() as { publicKeys?: PublicKey[] }
    const keys = card.publicKeys ?? []
    peerKeyCache.set(agentUrl, { keys, fetchedAt: Date.now() })
    return keys
  } catch {
    return []
  }
}

export interface VerifiedRequest {
  envelope: MessageEnvelope
  spanId: string
}

type VerifyResult =
  | { ok: true; data: VerifiedRequest }
  | { ok: false; response: NextResponse }

/**
 * Verify an incoming SAMVAD request.
 *
 * Two modes:
 * 1. Full envelope (from, to, nonce, timestamp, signatures) → full protocol verification
 * 2. Lightweight call (just skill + payload, no signatures) → allowed for public skills only
 *    (supports the registry playground and simple curl testing)
 */
export async function verifyIncoming(
  method: string,
  path: string,
  bodyBytes: Uint8Array,
  headers: Headers,
  clientIp: string,
): Promise<VerifyResult> {
  // Parse body
  let body: Record<string, unknown>
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes))
  } catch {
    return error(400, 'SCHEMA_INVALID', 'Invalid JSON body')
  }

  // Detect lightweight vs full envelope
  const isFullEnvelope = 'from' in body && 'nonce' in body && 'timestamp' in body
  if (!isFullEnvelope) {
    // Lightweight mode: only check rate limit, no crypto verification
    // Only allowed for public trust skills
    const rl = checkRateLimit(clientIp)
    if (!rl.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { status: 'error', error: { code: 'RATE_LIMITED', message: `Rate limit exceeded (${rl.limit} req/min)` } },
          { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': '60' } },
        ),
      }
    }

    if (!body.skill || typeof body.skill !== 'string') {
      return error(400, 'SCHEMA_INVALID', 'Missing required field: skill')
    }
    if (!body.payload || typeof body.payload !== 'object') {
      return error(400, 'SCHEMA_INVALID', 'Missing required field: payload')
    }

    // Lightweight mode is only allowed for public trust skills
    const skill = AGENT_CARD.skills.find(s => s.id === body.skill)
    if (skill && skill.trust !== 'public') {
      return error(401, 'AUTH_FAILED', `Skill "${body.skill}" requires ${skill.trust} access — send a full signed envelope`)
    }

    // Synthesize a minimal envelope for downstream handlers
    const envelope: MessageEnvelope = {
      from: 'agent://anonymous',
      to: AGENT_CARD.id,
      skill: body.skill as string,
      mode: 'sync',
      nonce: randomUUID(),
      timestamp: new Date().toISOString(),
      traceId: randomUUID(),
      spanId: randomUUID(),
      payload: body.payload as Record<string, unknown>,
    }
    return { ok: true, data: { envelope, spanId: randomUUID() } }
  }

  // Full envelope mode — strict protocol verification
  const envelope = body as unknown as MessageEnvelope

  // Validate required envelope fields
  const missing = ['from', 'to', 'skill', 'mode', 'nonce', 'timestamp', 'traceId', 'spanId', 'payload']
    .filter(f => !(f in envelope))
  if (missing.length > 0) {
    return error(400, 'SCHEMA_INVALID', `Missing required fields: ${missing.join(', ')}`)
  }

  if (typeof envelope.from !== 'string' || !envelope.from.startsWith('agent://')) {
    return error(400, 'SCHEMA_INVALID', 'from must be an agent:// URI')
  }

  if (envelope.to !== AGENT_CARD.id) {
    return error(400, 'SCHEMA_INVALID', `Invalid recipient: expected ${AGENT_CARD.id}`)
  }

  // 1. Nonce + timestamp check (cheapest rejection)
  const nonceResult = nonceStore.check(envelope.nonce, envelope.timestamp)
  if (nonceResult === 'expired') {
    return error(400, 'TIMESTAMP_EXPIRED', 'Request timestamp is outside the 5-minute window')
  }
  if (nonceResult === 'replay') {
    return error(401, 'REPLAY_DETECTED', 'Nonce already seen')
  }

  // 2. Rate limit
  const rl = checkRateLimit(clientIp)
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { traceId: envelope.traceId, spanId: randomUUID(), status: 'error', error: { code: 'RATE_LIMITED', message: `Rate limit exceeded (${rl.limit} req/min)` } },
        { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': '60' } },
      ),
    }
  }

  // 3. Signature verification
  const contentDigest = headers.get('content-digest')
  const signatureInput = headers.get('signature-input')
  const signature = headers.get('signature')

  if (!contentDigest || !signatureInput || !signature) {
    return error(401, 'AUTH_FAILED', 'Missing signature headers (Content-Digest, Signature-Input, Signature)')
  }

  const sigHeaders: RequestSignatureHeaders = {
    'content-digest': contentDigest,
    'signature-input': signatureInput,
    'signature': signature,
  }

  const peerKeys = await fetchPeerKeys(envelope.from)
  if (peerKeys.length === 0) {
    return error(401, 'AUTH_FAILED', `Could not fetch public keys for ${envelope.from}`)
  }

  let verified = false
  for (const pk of peerKeys) {
    if (!pk.active) continue
    try {
      const pubBytes = decodePublicKey(pk.key)
      if (await verifyRequest(method, path, bodyBytes, sigHeaders, pubBytes)) {
        verified = true
        break
      }
    } catch {
      // try next key
    }
  }

  if (!verified) {
    return error(401, 'AUTH_FAILED', 'Signature verification failed')
  }

  // 4. Trust tier enforcement
  const skill = AGENT_CARD.skills.find(s => s.id === envelope.skill)
  if (skill) {
    if (skill.trust === 'trusted-peers') {
      const allowed = skill.allowedPeers ?? []
      if (!allowed.includes(envelope.from)) {
        return error(403, 'AUTH_FAILED', `Caller ${envelope.from} is not in allowedPeers for skill "${envelope.skill}"`)
      }
    }
    // 'authenticated' would check envelope.auth here
    // 'public' — no further check needed
  }

  return {
    ok: true,
    data: {
      envelope,
      spanId: randomUUID(),
    },
  }
}

function error(status: number, code: string, message: string): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json(
      { status: 'error', error: { code, message } },
      { status, headers: CORS_HEADERS },
    ),
  }
}

export { CORS_HEADERS }
