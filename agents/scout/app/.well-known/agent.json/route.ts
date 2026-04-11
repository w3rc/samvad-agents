// app/.well-known/agent.json/route.ts
import { NextResponse } from 'next/server'
import { AGENT_CARD } from '@/lib/card'

export function GET() {
  return NextResponse.json(AGENT_CARD, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
