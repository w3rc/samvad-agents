import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/skills/readPage', () => ({ readPage: vi.fn() }))
vi.mock('../lib/skills/summarizePage', () => ({ summarizePage: vi.fn() }))

const { POST } = await import('../app/agent/message/route')
import * as readPageMod from '../lib/skills/readPage'
import * as summarizePageMod from '../lib/skills/summarizePage'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/agent/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /agent/message', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dispatches readPage skill and returns SAMVAD result envelope', async () => {
    vi.mocked(readPageMod.readPage).mockResolvedValue({
      title: 'My Page',
      content: 'Hello world',
      url: 'https://example.com',
      fetchedAt: '2026-04-11T00:00:00Z',
    })

    const res = await POST(makeRequest({ skill: 'readPage', payload: { url: 'https://example.com' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.result.title).toBe('My Page')
  })

  it('dispatches summarizePage skill and returns SAMVAD result envelope', async () => {
    vi.mocked(summarizePageMod.summarizePage).mockResolvedValue({
      title: 'My Page',
      summary: 'A summary.',
      keyPoints: ['Point 1'],
      url: 'https://example.com',
    })

    const res = await POST(makeRequest({ skill: 'summarizePage', payload: { url: 'https://example.com' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.result.summary).toBe('A summary.')
  })

  it('returns 404 with SKILL_NOT_FOUND for unknown skill', async () => {
    const res = await POST(makeRequest({ skill: 'flyToTheMoon', payload: {} }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.code).toBe('SKILL_NOT_FOUND')
    expect(body.message).toContain('flyToTheMoon')
  })

  it('returns 400 with SCHEMA_INVALID when skill field is missing', async () => {
    const res = await POST(makeRequest({ payload: { url: 'https://example.com' } }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.code).toBe('SCHEMA_INVALID')
  })

  it('returns 400 with SCHEMA_INVALID when payload field is missing', async () => {
    const res = await POST(makeRequest({ skill: 'readPage' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.code).toBe('SCHEMA_INVALID')
  })

  it('returns 500 with AGENT_UNAVAILABLE when skill handler throws', async () => {
    vi.mocked(readPageMod.readPage).mockRejectedValue(new Error('Jina down'))
    const res = await POST(makeRequest({ skill: 'readPage', payload: { url: 'https://example.com' } }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.code).toBe('AGENT_UNAVAILABLE')
    expect(body.message).toContain('Jina down')
  })
})
