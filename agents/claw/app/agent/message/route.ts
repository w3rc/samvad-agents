// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { callOpenClaw } from '@/lib/openclaw'

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

  if (skill !== 'chat') {
    return NextResponse.json(
      {
        status: 'error',
        code: 'SKILL_NOT_FOUND',
        message: `Unknown skill: ${skill}. Available: chat`,
      },
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

  const channel = typeof p.channel === 'string' ? p.channel : 'samvad'

  try {
    const result = await callOpenClaw(p.message, channel)
    return NextResponse.json({ status: 'ok', result }, { headers: CORS_HEADERS })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { status: 'error', code: 'AGENT_UNAVAILABLE', message },
      { status: 502, headers: CORS_HEADERS },
    )
  }
}
