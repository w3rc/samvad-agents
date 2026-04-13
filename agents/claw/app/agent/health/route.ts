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

async function pingGateway(gatewayUrl: string): Promise<'reachable' | 'unreachable' | string> {
  try {
    const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) return 'reachable'
    return `unreachable (HTTP ${res.status})`
  } catch (e) {
    return `unreachable (${e instanceof Error ? e.message : String(e)})`
  }
}

export async function GET() {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json(
      {
        status: 'degraded',
        agent: 'claw',
        protocolVersion: '1.2',
        openclaw: !gatewayUrl ? 'missing OPENCLAW_GATEWAY_URL' : 'missing OPENCLAW_GATEWAY_TOKEN',
      },
      { headers: CORS_HEADERS },
    )
  }

  const ping = await pingGateway(gatewayUrl)
  const online = ping === 'reachable'

  return NextResponse.json(
    {
      status: online ? 'ok' : 'degraded',
      agent: 'claw',
      protocolVersion: '1.2',
      openclaw: online ? 'online' : `offline — ${ping}`,
    },
    { headers: CORS_HEADERS },
  )
}
