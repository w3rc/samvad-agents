// app/agent/health/route.ts
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ status: 'ok', agent: 'scout', protocolVersion: '1.2' })
}
