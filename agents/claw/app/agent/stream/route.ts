// app/agent/stream/route.ts
// SSE streaming endpoint. Sends progress events while OpenClaw processes
// the request, then a final 'result' event with the reply.

import { NextRequest } from 'next/server'
import { callOpenClaw } from '@/lib/openclaw'
import { checkRateLimit } from '@/lib/rate-limiter'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ status: 'error', code: 'RATE_LIMITED', message: `Rate limit exceeded (${rl.limit} req/min)` }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...CORS_HEADERS } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ status: 'error', code: 'SCHEMA_INVALID', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('skill' in body) ||
    typeof (body as Record<string, unknown>).skill !== 'string' ||
    !('payload' in body)
  ) {
    return new Response(
      JSON.stringify({ status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required fields: skill, payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const { skill, payload } = body as { skill: string; payload: unknown }

  if (skill !== 'chat') {
    return new Response(
      JSON.stringify({ status: 'error', code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${skill}. Available: chat` }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const p = payload as Record<string, unknown>
  if (!p || typeof p.message !== 'string' || !p.message.trim()) {
    return new Response(
      JSON.stringify({ status: 'error', code: 'SCHEMA_INVALID', message: 'payload.message (string) is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }

  const message = p.message
  const channel = typeof p.channel === 'string' ? p.channel : 'samvad'

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s)

      // Keep-alive comment every 15s while waiting for OpenClaw
      let done = false
      const keepAlive = setInterval(() => {
        if (!done) controller.enqueue(encode(': keep-alive\n\n'))
      }, 15_000)

      try {
        controller.enqueue(encode(sseEvent('status', { status: 'processing' })))
        const result = await callOpenClaw(message, channel)
        controller.enqueue(encode(sseEvent('result', { status: 'ok', result })))
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        controller.enqueue(encode(sseEvent('error', { status: 'error', code: 'AGENT_UNAVAILABLE', message: error })))
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
