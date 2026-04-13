// app/agent/task/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { callOpenClaw } from '@/lib/openclaw'
import { createTask, updateTask } from '@/lib/task-store'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('skill' in body) ||
    typeof (body as Record<string, unknown>).skill !== 'string' ||
    !('payload' in body)
  ) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required fields: skill, payload' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const { skill, payload } = body as { skill: string; payload: unknown }

  if (skill !== 'chat') {
    return NextResponse.json(
      { status: 'error', code: 'SKILL_NOT_FOUND', message: `Unknown skill: ${skill}. Available: chat` },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const p = payload as Record<string, unknown>
  if (!p || typeof p.message !== 'string' || !p.message.trim()) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'payload.message (string) is required' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const taskId = randomUUID()
  createTask(taskId)

  const message = p.message
  const channel = typeof p.channel === 'string' ? p.channel : 'samvad'

  // Dispatch after response flies
  Promise.resolve().then(async () => {
    updateTask(taskId, { status: 'running' })
    try {
      const result = await callOpenClaw(message, channel)
      updateTask(taskId, { status: 'completed', result })
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      updateTask(taskId, { status: 'failed', error })
    }
  })

  return NextResponse.json(
    { status: 'accepted', taskId },
    { status: 202, headers: CORS_HEADERS },
  )
}
