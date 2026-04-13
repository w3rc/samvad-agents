// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { callOpenClaw } from '@/lib/openclaw'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/message', bodyBytes, req.headers, ip)
  if (!result.ok) return result.response

  const { envelope, spanId } = result.data

  if (envelope.skill !== 'chat') {
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${envelope.skill}. Available: chat` } },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const p = envelope.payload as Record<string, unknown>
  if (typeof p.message !== 'string' || !p.message.trim()) {
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'SCHEMA_INVALID', message: 'payload.message (string) is required' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const channel = typeof p.channel === 'string' ? p.channel : 'samvad'

  try {
    const res = await callOpenClaw(p.message, channel)
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'ok', result: res },
      { headers: CORS_HEADERS },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'AGENT_UNAVAILABLE', message } },
      { status: 502, headers: CORS_HEADERS },
    )
  }
}
