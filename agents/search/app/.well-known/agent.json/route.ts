import { NextResponse } from 'next/server'
import { getAgentCard } from '@/lib/card'

export async function GET() {
  const card = await getAgentCard()
  return NextResponse.json(card, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
