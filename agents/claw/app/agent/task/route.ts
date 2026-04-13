// app/agent/task/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { callOpenClaw } from '@/lib/openclaw'
import { createTask, updateTask } from '@/lib/task-store'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/task', bodyBytes, req.headers, ip)
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

  const taskId = randomUUID()
  createTask(taskId)

  const message = p.message
  const channel = typeof p.channel === 'string' ? p.channel : 'samvad'

  Promise.resolve().then(async () => {
    updateTask(taskId, { status: 'running' })
    try {
      const res = await callOpenClaw(message, channel)
      updateTask(taskId, { status: 'completed', result: res })
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      updateTask(taskId, { status: 'failed', error })
    }
  })

  return NextResponse.json(
    { traceId: envelope.traceId, spanId, status: 'accepted', taskId },
    { status: 202, headers: CORS_HEADERS },
  )
}
