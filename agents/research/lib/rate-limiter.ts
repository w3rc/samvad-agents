// lib/rate-limiter.ts
// Sliding-window rate limiter keyed by client IP.
// Lower limits than Scout — each research call fans out to 3 Scout calls + Tavily + Groq.

interface Window {
  timestamps: number[]
}

const windows = new Map<string, Window>()

const WINDOW_MS = 60_000
const MAX_PER_IP = 3 // matches rateLimit.requestsPerSender in the agent card

function cleanup(win: Window, now: number): void {
  const cutoff = now - WINDOW_MS
  while (win.timestamps.length > 0 && win.timestamps[0] <= cutoff) {
    win.timestamps.shift()
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
}

export function checkRateLimit(clientIp: string): RateLimitResult {
  const now = Date.now()

  let win = windows.get(clientIp)
  if (!win) {
    win = { timestamps: [] }
    windows.set(clientIp, win)
  }

  cleanup(win, now)

  if (win.timestamps.length === 0 && windows.size > 10_000) {
    windows.delete(clientIp)
    win = { timestamps: [] }
    windows.set(clientIp, win)
  }

  if (win.timestamps.length >= MAX_PER_IP) {
    return { allowed: false, limit: MAX_PER_IP, remaining: 0 }
  }

  win.timestamps.push(now)
  return {
    allowed: true,
    limit: MAX_PER_IP,
    remaining: MAX_PER_IP - win.timestamps.length,
  }
}
