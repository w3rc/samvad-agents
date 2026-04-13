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
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN
  const configured = Boolean(gatewayUrl && gatewayToken)

  return NextResponse.json(
    {
      status: configured ? 'ok' : 'degraded',
      agent: 'claw',
      protocolVersion: '1.2',
      openclaw: configured
        ? 'configured'
        : !gatewayUrl
          ? 'missing OPENCLAW_GATEWAY_URL'
          : 'missing OPENCLAW_GATEWAY_TOKEN',
    },
    { headers: CORS_HEADERS },
  )
}
