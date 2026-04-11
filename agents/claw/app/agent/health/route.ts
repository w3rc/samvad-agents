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
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL
  const configured = Boolean(webhookUrl)

  return NextResponse.json(
    {
      status: configured ? 'ok' : 'degraded',
      agent: 'claw',
      protocolVersion: '1.2',
      openclaw: configured ? 'configured' : 'missing OPENCLAW_WEBHOOK_URL',
    },
    { headers: CORS_HEADERS },
  )
}
