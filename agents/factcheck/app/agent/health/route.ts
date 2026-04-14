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

export function GET() {
  return NextResponse.json(
    { status: 'ok', agent: 'factcheck', protocolVersion: '1.2' },
    { headers: CORS_HEADERS },
  )
}
