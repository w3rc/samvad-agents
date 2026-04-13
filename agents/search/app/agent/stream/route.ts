import { NextRequest } from 'next/server'
import { search } from '@/lib/skills/search'
import { searchNews } from '@/lib/skills/searchNews'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  search: search as (input: unknown) => Promise<unknown>,
  searchNews: searchNews as (input: unknown) => Promise<unknown>,
}

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }) }

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/stream', bodyBytes, req.headers, ip)
  if (!result.ok) {
    const body = await result.response.json()
    return new Response(JSON.stringify(body), { status: result.response.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
  }

  const { envelope, spanId } = result.data
  const traceId = envelope.traceId
  const handler = handlers[envelope.skill]

  if (!handler) {
    return new Response(
      JSON.stringify({ traceId, spanId, status: 'error', error: { code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${envelope.skill}` } }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s)
      let done = false
      const keepAlive = setInterval(() => { if (!done) controller.enqueue(encode(': keep-alive\n\n')) }, 15_000)
      try {
        controller.enqueue(encode(sseEvent('status', { traceId, spanId, status: 'processing' })))
        const res = await handler(envelope.payload)
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

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...CORS_HEADERS } })
}
