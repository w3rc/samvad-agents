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

  it('dispatches readPage skill and returns output', async () => {
    vi.mocked(readPageMod.readPage).mockResolvedValue({
      title: 'My Page',
      content: 'Hello world',
      url: 'https://example.com',
      fetchedAt: '2026-04-11T00:00:00Z',
    })

    const res = await POST(makeRequest({ skill: 'readPage', input: { url: 'https://example.com' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.output.title).toBe('My Page')
    expect(body.skill).toBe('readPage')
  })

  it('dispatches summarizePage skill and returns output', async () => {
    vi.mocked(summarizePageMod.summarizePage).mockResolvedValue({
      title: 'My Page',
      summary: 'A summary.',
      keyPoints: ['Point 1'],
      url: 'https://example.com',
    })

    const res = await POST(makeRequest({ skill: 'summarizePage', input: { url: 'https://example.com' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.output.summary).toBe('A summary.')
  })

  it('returns 404 for unknown skill', async () => {
    const res = await POST(makeRequest({ skill: 'flyToTheMoon', input: {} }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('flyToTheMoon')
  })

  it('returns 400 when skill field is missing', async () => {
    const res = await POST(makeRequest({ input: { url: 'https://example.com' } }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when input field is missing', async () => {
    const res = await POST(makeRequest({ skill: 'readPage' }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when skill handler throws', async () => {
    vi.mocked(readPageMod.readPage).mockRejectedValue(new Error('Jina down'))
    const res = await POST(makeRequest({ skill: 'readPage', input: { url: 'https://example.com' } }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Jina down')
  })
})
