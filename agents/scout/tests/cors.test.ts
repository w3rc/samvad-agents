// agents/scout/tests/cors.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock skill modules before importing route
vi.mock('../lib/skills/readPage', () => ({
  readPage: vi.fn().mockResolvedValue({ title: 'Test', content: 'body', url: 'https://example.com', fetchedAt: '2026-01-01' }),
}))
vi.mock('../lib/skills/summarizePage', () => ({
  summarizePage: vi.fn().mockResolvedValue({ summary: 'A summary', url: 'https://example.com', fetchedAt: '2026-01-01' }),
}))

const { POST, OPTIONS } = await import('../app/agent/message/route')

describe('CORS headers', () => {
  it('POST response includes Access-Control-Allow-Origin: *', async () => {
    const req = new Request('http://localhost/agent/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'readPage', payload: { url: 'https://example.com' } }),
    })
    const res = await POST(req as any)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('OPTIONS preflight returns 204 with CORS headers', async () => {
    const req = new Request('http://localhost/agent/message', { method: 'OPTIONS' })
    const res = await OPTIONS(req as any)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('error responses also include CORS headers', async () => {
    const req = new Request('http://localhost/agent/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'unknownSkill', payload: {} }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
