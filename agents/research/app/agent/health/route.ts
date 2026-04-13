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
  const tavily = Boolean(process.env.TAVILY_API_KEY)
  const groq = Boolean(process.env.GROQ_API_KEY)
  const configured = tavily && groq

  return NextResponse.json(
    {
      status: configured ? 'ok' : 'degraded',
      agent: 'research',
      protocolVersion: '1.2',
      tavily: tavily ? 'configured' : 'missing TAVILY_API_KEY',
      groq: groq ? 'configured' : 'missing GROQ_API_KEY',
    },
    { headers: CORS_HEADERS },
  )
}
