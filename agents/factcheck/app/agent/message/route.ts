// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { factCheck } from '@/lib/skills/factCheck'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  factCheck: factCheck,
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/message', bodyBytes, req.headers, ip)
  if (!result.ok) return result.response

  const { envelope, spanId } = result.data

  const handler = handlers[envelope.skill]
  if (!handler) {
    return NextResponse.json(
      {
        traceId: envelope.traceId,
        spanId,
        status: 'error',
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Unknown skill: ${envelope.skill}. Available: ${Object.keys(handlers).join(', ')}`,
        },
      },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  try {
    const res = await handler(envelope.payload)
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'ok', result: res },
      { headers: CORS_HEADERS },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        traceId: envelope.traceId,
        spanId,
        status: 'error',
        error: { code: 'AGENT_UNAVAILABLE', message },
      },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
