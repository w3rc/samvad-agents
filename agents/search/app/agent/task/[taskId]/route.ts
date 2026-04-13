import { NextRequest, NextResponse } from 'next/server'
import { getTask } from '@/lib/task-store'

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS_HEADERS }) }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const task = getTask(taskId)
  if (!task) return NextResponse.json({ status: 'error', code: 'NOT_FOUND', message: `Task ${taskId} not found` }, { status: 404, headers: CORS_HEADERS })
  return NextResponse.json({ taskId: task.id, status: task.status, ...(task.result && { result: task.result }), ...(task.error && { error: task.error }) }, { headers: CORS_HEADERS })
}
