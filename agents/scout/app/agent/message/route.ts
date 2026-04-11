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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('skill' in body) ||
    typeof (body as Record<string, unknown>).skill !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required field: skill (string)' }, { status: 400 })
  }

  if (!('input' in body)) {
    return NextResponse.json({ error: 'Missing required field: input' }, { status: 400 })
  }

  const { skill, input } = body as { skill: string; input: unknown }

  const handler = handlers[skill]
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown skill: ${skill}. Available: ${Object.keys(handlers).join(', ')}` },
      { status: 404 },
    )
  }

  try {
    const output = await handler(input)
    return NextResponse.json({ skill, output })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
