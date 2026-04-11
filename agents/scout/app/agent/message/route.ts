// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readPage } from '@/lib/skills/readPage'
import { summarizePage } from '@/lib/skills/summarizePage'

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  readPage: readPage as (input: unknown) => Promise<unknown>,
  summarizePage: summarizePage as (input: unknown) => Promise<unknown>,
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('skill' in body) ||
    typeof (body as Record<string, unknown>).skill !== 'string'
  ) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required field: skill (string)' },
      { status: 400 },
    )
  }

  if (!('payload' in body)) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required field: payload' },
      { status: 400 },
    )
  }

  const { skill, payload } = body as { skill: string; payload: unknown }

  const handler = handlers[skill]
  if (!handler) {
    return NextResponse.json(
      {
        status: 'error',
        code: 'SKILL_NOT_FOUND',
        message: `Unknown skill: ${skill}. Available: ${Object.keys(handlers).join(', ')}`,
      },
      { status: 404 },
    )
  }

  try {
    const result = await handler(payload)
    return NextResponse.json({ status: 'ok', result })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { status: 'error', code: 'AGENT_UNAVAILABLE', message },
      { status: 500 },
    )
  }
}
