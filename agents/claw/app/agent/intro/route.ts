// app/agent/intro/route.ts
import { NextResponse } from 'next/server'
import { AGENT_CARD } from '@/lib/card'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function GET() {
  return NextResponse.json(AGENT_CARD, {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  })
}
