// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readPage } from '@/lib/skills/readPage'
import { summarizePage } from '@/lib/skills/summarizePage'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  readPage: readPage as (input: unknown) => Promise<unknown>,
  summarizePage: summarizePage as (input: unknown) => Promise<unknown>,
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
    typeof (body as Record<string, unknown>).skill !== 'string'
  ) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required field: skill (string)' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  if (!('payload' in body)) {
    return NextResponse.json(
      { status: 'error', code: 'SCHEMA_INVALID', message: 'Missing required field: payload' },
      { status: 400, headers: CORS_HEADERS },
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
      { status: 404, headers: CORS_HEADERS },
    )
  }

  try {
    const result = await handler(payload)
    return NextResponse.json({ status: 'ok', result }, { headers: CORS_HEADERS })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { status: 'error', code: 'AGENT_UNAVAILABLE', message },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
