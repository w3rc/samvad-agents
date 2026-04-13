import { NextResponse } from 'next/server'

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }) }

export function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY)
  return NextResponse.json(
    { status: configured ? 'ok' : 'degraded', agent: 'translator', protocolVersion: '1.2', gemini: configured ? 'configured' : 'missing GEMINI_API_KEY' },
    { headers: CORS_HEADERS },
  )
}
