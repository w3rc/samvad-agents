// app/agent/intro/route.ts
import { NextResponse } from 'next/server'
import { getAgentCard } from '@/lib/card'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  const card = await getAgentCard()
  return NextResponse.json(card, {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  })
}
