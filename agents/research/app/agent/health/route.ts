// app/agent/health/route.ts
import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  const groq = Boolean(process.env.GROQ_API_KEY)

  return NextResponse.json(
    {
      status: groq ? 'ok' : 'degraded',
      agent: 'research',
      protocolVersion: '1.2',
      search: 'via Search agent (SAMVAD)',
      scout: 'via Scout agent (SAMVAD)',
      groq: groq ? 'configured' : 'missing GROQ_API_KEY',
    },
    { headers: CORS_HEADERS },
  )
}
