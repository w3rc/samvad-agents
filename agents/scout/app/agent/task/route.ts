// app/agent/task/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { readPage } from '@/lib/skills/readPage'
import { summarizePage } from '@/lib/skills/summarizePage'
import { createTask, updateTask } from '@/lib/task-store'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  readPage: readPage as (input: unknown) => Promise<unknown>,
  summarizePage: summarizePage as (input: unknown) => Promise<unknown>,
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/task', bodyBytes, req.headers, ip)
  if (!result.ok) return result.response

  const { envelope, spanId } = result.data

  const handler = handlers[envelope.skill]
  if (!handler) {
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'error', error: { code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${envelope.skill}. Available: ${Object.keys(handlers).join(', ')}` } },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const taskId = randomUUID()
  createTask(taskId)

  Promise.resolve().then(async () => {
    updateTask(taskId, { status: 'running' })
    try {
      const res = await handler(envelope.payload) as Record<string, unknown>
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
