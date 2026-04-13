// lib/rate-limiter.ts
// Sliding-window rate limiter. Per-IP for global limit, per-IP for sender limit.
// In-memory — resets on cold start, which is fine for Vercel serverless.

interface Window {
  timestamps: number[]
}

const globalWindows = new Map<string, Window>()
const senderWindows = new Map<string, Window>()

const WINDOW_MS = 60_000
const MAX_PER_MINUTE = 20
const MAX_PER_SENDER = 5

function cleanup(win: Window, now: number): void {
  const cutoff = now - WINDOW_MS
  while (win.timestamps.length > 0 && win.timestamps[0] <= cutoff) {
    win.timestamps.shift()
  }
}

function getWindow(map: Map<string, Window>, key: string): Window {
  let win = map.get(key)
  if (!win) {
    win = { timestamps: [] }
    map.set(key, win)
  }
  return win
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
}

export function checkRateLimit(clientIp: string): RateLimitResult {
  const now = Date.now()

  // Per-sender check (stricter)
  const sender = getWindow(senderWindows, clientIp)
  cleanup(sender, now)
  if (sender.timestamps.length >= MAX_PER_SENDER) {
    return { allowed: false, limit: MAX_PER_SENDER, remaining: 0 }
  }

  // Global per-IP check
  const global = getWindow(globalWindows, clientIp)
  cleanup(global, now)
  if (global.timestamps.length >= MAX_PER_MINUTE) {
    return { allowed: false, limit: MAX_PER_MINUTE, remaining: 0 }
  }

  sender.timestamps.push(now)
  global.timestamps.push(now)

  return {
    allowed: true,
    limit: MAX_PER_SENDER,
    remaining: MAX_PER_SENDER - sender.timestamps.length,
  }
}
