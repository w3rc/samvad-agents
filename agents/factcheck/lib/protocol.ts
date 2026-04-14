// lib/protocol.ts
// SAMVAD protocol verification — thin wrapper around SDK's createVerifyMiddleware.

import { NextResponse } from 'next/server'
import { createVerifyMiddleware } from '@samvad-protocol/sdk'
import type { VerifyResult } from '@samvad-protocol/sdk'
import { checkRateLimit } from './rate-limiter'
import { AGENT_CARD } from './card'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Digest, Signature-Input, Signature',
}

const verify = createVerifyMiddleware({
  agentId: AGENT_CARD.id,
  skills: AGENT_CARD.skills,
  rateLimiter: (ip) => checkRateLimit(ip),
})

export type { VerifiedRequest } from '@samvad-protocol/sdk'

export type WrappedVerifyResult =
  | { ok: true; data: { envelope: import('@samvad-protocol/sdk').MessageEnvelope; spanId: string } }
  | { ok: false; response: NextResponse }

export async function verifyIncoming(
  method: string,
  path: string,
  bodyBytes: Uint8Array,
  headers: Headers,
  clientIp: string,
): Promise<WrappedVerifyResult> {
  const result: VerifyResult = await verify(method, path, bodyBytes, headers, clientIp)
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          status: 'error',
          error: { code: result.error.code, message: result.error.message },
          ...(result.error.traceId && { traceId: result.error.traceId }),
        },
        { status: result.error.status, headers: CORS_HEADERS },
      ),
    }
  }
  return result
}
