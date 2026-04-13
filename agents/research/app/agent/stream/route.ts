// app/agent/stream/route.ts
// SSE streaming with real-time status events as the research pipeline progresses.

import { NextRequest } from 'next/server'
import { research } from '@/lib/skills/research'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/stream', bodyBytes, req.headers, ip)
  if (!result.ok) {
    const body = await result.response.json()
    return new Response(JSON.stringify(body), {
      status: result.response.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const { envelope, spanId } = result.data
  const traceId = envelope.traceId

  if (envelope.skill !== 'research') {
    return new Response(
      JSON.stringify({ traceId, spanId, status: 'error', error: { code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${envelope.skill}. Available: research` } }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const p = envelope.payload as Record<string, unknown>
  if (typeof p.topic !== 'string' || !p.topic.trim()) {
    return new Response(
      JSON.stringify({ traceId, spanId, status: 'error', error: { code: 'SCHEMA_INVALID', message: 'payload.topic (string) is required' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const topic = p.topic
  const urls = Array.isArray(p.urls) ? p.urls.filter((u): u is string => typeof u === 'string') : undefined

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s)

      let done = false
      const keepAlive = setInterval(() => {
        if (!done) controller.enqueue(encode(': keep-alive\n\n'))
      }, 15_000)

      try {
        const res = await research({ topic, urls }, (step, message) => {
          controller.enqueue(encode(sseEvent('status', { traceId, spanId, step, message })))
        })
        controller.enqueue(encode(sseEvent('result', { traceId, spanId, status: 'ok', result: res })))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        controller.enqueue(encode(sseEvent('error', { traceId, spanId, status: 'error', error: { code: 'AGENT_UNAVAILABLE', message: msg } })))
      } finally {
        done = true
        clearInterval(keepAlive)
        controller.enqueue(encode('event: done\ndata: {}\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  })
}
