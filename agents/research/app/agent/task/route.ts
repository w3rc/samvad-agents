// app/agent/task/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { research } from '@/lib/skills/research'
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

  if (envelope.skill !== 'research') {
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${envelope.skill}. Available: research` } },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const p = envelope.payload as Record<string, unknown>
  if (typeof p.topic !== 'string' || !p.topic.trim()) {
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'SCHEMA_INVALID', message: 'payload.topic (string) is required' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const taskId = randomUUID()
  createTask(taskId)

  const topic = p.topic
  const urls = Array.isArray(p.urls) ? p.urls.filter((u): u is string => typeof u === 'string') : undefined

  Promise.resolve().then(async () => {
    updateTask(taskId, { status: 'running' })
    try {
      const res = await research({ topic, urls }) as unknown as Record<string, unknown>
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
