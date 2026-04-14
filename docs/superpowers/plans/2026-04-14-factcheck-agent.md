# FactCheck Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SAMVAD agent at `agents/factcheck/` that accepts a claim string and returns a confidence score, verdict label, reasoning, and citations by calling the Search and Scout agents over SAMVAD and synthesizing with Groq.

**Architecture:** Search agent (Tavily) → Scout agent (Jina) × 3 → Groq verdict synthesis → label derivation. Single `factCheck` skill, sync mode only, public trust tier.

**Tech Stack:** Next.js 16, TypeScript, `@samvad-protocol/sdk` ^0.5.0, `@noble/ed25519`, Groq `llama-3.3-70b-versatile`, Vitest, deployed on Vercel.

---

## File Map

```
agents/factcheck/
  lib/
    card.ts            AgentCard — id, name, url, skills, publicKey
    keys.ts            Load Ed25519 keypair from SAMVAD_PRIVATE_KEY env var
    protocol.ts        createVerifyMiddleware wrapper
    rate-limiter.ts    Sliding-window rate limiter per IP
    groq.ts            getVerdict() → VerdictResult
    search-client.ts   callSearchAgent() → SearchResult[]
    scout-client.ts    callScoutSummarize() → ScoutSummary
    skills/
      factCheck.ts     factCheck(input) → FactCheckOutput  (main orchestration)
  app/
    agent/
      message/route.ts     POST /agent/message
      health/route.ts      GET /agent/health
    .well-known/
      agent.json/route.ts  GET /.well-known/agent.json
    layout.tsx
    page.tsx
    globals.css
  tests/
    groq.test.ts
    factCheck.test.ts
  package.json
  tsconfig.json
  next.config.ts
  vitest.config.ts
  vercel.json
  postcss.config.mjs
  eslint.config.mjs
  .gitignore
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `agents/factcheck/package.json`
- Create: `agents/factcheck/tsconfig.json`
- Create: `agents/factcheck/next.config.ts`
- Create: `agents/factcheck/vitest.config.ts`
- Create: `agents/factcheck/vercel.json`
- Create: `agents/factcheck/postcss.config.mjs`
- Create: `agents/factcheck/eslint.config.mjs`
- Create: `agents/factcheck/.gitignore`
- Create: `agents/factcheck/app/globals.css`

- [ ] **Step 1: Create the agent directory**

```bash
mkdir -p agents/factcheck/lib/skills agents/factcheck/app/agent/message agents/factcheck/app/agent/health agents/factcheck/app/.well-known/agent.json agents/factcheck/tests
```

- [ ] **Step 2: Write `agents/factcheck/package.json`**

```json
{
  "name": "factcheck",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@noble/ed25519": "^3.1.0",
    "@samvad-protocol/sdk": "^0.5.0",
    "next": "16.2.3",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.1",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.2.3",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.4"
  }
}
```

- [ ] **Step 3: Write `agents/factcheck/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `agents/factcheck/next.config.ts`**

```ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {}
export default nextConfig
```

- [ ] **Step 5: Write `agents/factcheck/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 6: Write `agents/factcheck/vercel.json`**

```json
{}
```

- [ ] **Step 7: Write `agents/factcheck/postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
```

- [ ] **Step 8: Write `agents/factcheck/eslint.config.mjs`**

```js
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])
export default eslintConfig
```

- [ ] **Step 9: Write `agents/factcheck/.gitignore`**

```
/node_modules
/.next/
/out/
/build
.DS_Store
*.pem
npm-debug.log*
.env*
.vercel
*.tsbuildinfo
next-env.d.ts
/coverage
.samvad/
```

- [ ] **Step 10: Write `agents/factcheck/app/globals.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; }
```

- [ ] **Step 11: Install dependencies**

```bash
cd agents/factcheck && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 12: Commit**

```bash
git add agents/factcheck/package.json agents/factcheck/tsconfig.json agents/factcheck/next.config.ts agents/factcheck/vitest.config.ts agents/factcheck/vercel.json agents/factcheck/postcss.config.mjs agents/factcheck/eslint.config.mjs agents/factcheck/.gitignore agents/factcheck/app/globals.css
git commit -m "feat(factcheck): scaffold project"
```

---

## Task 2: Infrastructure — keys and rate limiter

**Files:**
- Create: `agents/factcheck/lib/keys.ts`
- Create: `agents/factcheck/lib/rate-limiter.ts`

- [ ] **Step 1: Write `agents/factcheck/lib/keys.ts`**

```ts
// lib/keys.ts
// Load the agent's Ed25519 keypair from the SAMVAD_PRIVATE_KEY environment variable.
// Generate one with:
//   node -e "import('crypto').then(c => console.log(c.randomBytes(32).toString('base64')))"

import { encodePublicKey } from '@samvad-protocol/sdk'
import * as ed from '@noble/ed25519'

export interface AgentKeypair {
  kid: string
  privateKey: Uint8Array
  publicKey: Uint8Array
  publicKeyBase64: string
}

let cached: AgentKeypair | null = null

export async function getKeypair(): Promise<AgentKeypair> {
  if (cached) return cached

  const b64 = process.env.SAMVAD_PRIVATE_KEY
  if (!b64) throw new Error('SAMVAD_PRIVATE_KEY is not configured')

  const privateKey = new Uint8Array(Buffer.from(b64, 'base64'))
  const publicKey = await ed.getPublicKeyAsync(privateKey)

  cached = {
    kid: 'factcheck-key-1',
    privateKey,
    publicKey,
    publicKeyBase64: encodePublicKey(publicKey),
  }
  return cached
}
```

- [ ] **Step 2: Write `agents/factcheck/lib/rate-limiter.ts`**

```ts
// lib/rate-limiter.ts
// Sliding-window rate limiter keyed by client IP.
// In-memory — resets on cold start, fine for Vercel serverless.

interface Window {
  timestamps: number[]
}

const windows = new Map<string, Window>()

const WINDOW_MS = 60_000
const MAX_PER_IP = 10

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
```

- [ ] **Step 3: Commit**

```bash
git add agents/factcheck/lib/keys.ts agents/factcheck/lib/rate-limiter.ts
git commit -m "feat(factcheck): add keys and rate limiter"
```

---

## Task 3: Agent card

**Files:**
- Create: `agents/factcheck/lib/card.ts`

- [ ] **Step 1: Write `agents/factcheck/lib/card.ts`**

```ts
// lib/card.ts
import type { AgentCard } from '@samvad-protocol/sdk'
import { getKeypair } from './keys'

const BASE_CARD: AgentCard = {
  id: 'agent://samvad-agents-factcheck.vercel.app',
  name: 'FactCheck',
  version: '1.0.0',
  description:
    'Checks claims against live web sources. Returns a confidence score, verdict label (supported / refuted / disputed / unverifiable), reasoning, and citations.',
  url: 'https://samvad-agents-factcheck.vercel.app',
  protocolVersion: '1.2',
  specializations: ['fact-checking', 'research', 'verification'],
  models: [{ provider: 'groq', model: 'llama-3.3-70b-versatile' }],
  skills: [
    {
      id: 'factCheck',
      name: 'Fact Check',
      description:
        'Checks a claim against live web sources. Calls the Search agent and Scout agent over SAMVAD, then synthesizes a verdict with Groq.',
      inputSchema: {
        type: 'object',
        properties: {
          claim: { type: 'string', description: 'The statement to verify.' },
          context: { type: 'string', description: 'Optional background to sharpen search queries.' },
        },
        required: ['claim'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          label: { type: 'string', enum: ['supported', 'refuted', 'disputed', 'unverifiable'] },
          reasoning: { type: 'string' },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                relevance: { type: 'string', enum: ['supports', 'refutes', 'neutral'] },
              },
              required: ['url', 'title', 'relevance'],
            },
          },
          agentCalls: { type: 'number' },
        },
        required: ['claim', 'confidence', 'label', 'reasoning', 'citations', 'agentCalls'],
      },
      modes: ['sync'],
      trust: 'public',
    },
  ],
  publicKeys: [],
  auth: { schemes: ['none'] },
  rateLimit: { requestsPerMinute: 30, requestsPerSender: 10 },
  cardTTL: 3600,
  endpoints: {
    intro: '/agent/intro',
    message: '/agent/message',
    task: '/agent/task',
    taskStatus: '/agent/task/:taskId',
    stream: '/agent/stream',
    health: '/agent/health',
  },
} as AgentCard

export async function getAgentCard(): Promise<AgentCard> {
  try {
    const kp = await getKeypair()
    return {
      ...BASE_CARD,
      publicKeys: [{ kid: kp.kid, key: kp.publicKeyBase64, active: true }],
    } as AgentCard
  } catch {
    return BASE_CARD
  }
}

// Synchronous reference for protocol.ts — uses id, skills, and static fields only.
export const AGENT_CARD = BASE_CARD
```

- [ ] **Step 2: Commit**

```bash
git add agents/factcheck/lib/card.ts
git commit -m "feat(factcheck): add agent card"
```

---

## Task 4: Groq verdict client (TDD)

**Files:**
- Create: `agents/factcheck/tests/groq.test.ts` (first)
- Create: `agents/factcheck/lib/groq.ts`

- [ ] **Step 1: Write the failing tests in `agents/factcheck/tests/groq.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

process.env.GROQ_API_KEY = 'test-key'

const { getVerdict, GroqError } = await import('../lib/groq')

const SOURCES = [
  { title: 'Source A', summary: 'Summary A', url: 'https://a.com' },
  { title: 'Source B', summary: 'Summary B', url: 'https://b.com' },
]

const VALID_GROQ_RESPONSE = {
  confidence: 0.85,
  direction: 'supports',
  reasoning: 'Evidence supports the claim.',
  citationRelevance: ['supports', 'neutral'],
}

describe('getVerdict', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns verdict on valid Groq response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(VALID_GROQ_RESPONSE) } }],
      }),
    })

    const result = await getVerdict('Water is wet', SOURCES)
    expect(result.confidence).toBe(0.85)
    expect(result.direction).toBe('supports')
    expect(result.reasoning).toBe('Evidence supports the claim.')
    expect(result.citationRelevance).toEqual(['supports', 'neutral'])
  })

  it('throws GroqError on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError on invalid JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json at all' } }],
      }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError on empty choices', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })

  it('throws GroqError when response shape is unexpected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ wrong: 'shape' }) } }],
      }),
    })
    await expect(getVerdict('claim', SOURCES)).rejects.toThrow(GroqError)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agents/factcheck && npm test -- tests/groq.test.ts
```

Expected: FAIL — `Cannot find module '../lib/groq'`

- [ ] **Step 3: Write `agents/factcheck/lib/groq.ts`**

```ts
// lib/groq.ts

export interface VerdictResult {
  confidence: number
  direction: 'supports' | 'refutes'
  reasoning: string
  citationRelevance: Array<'supports' | 'refutes' | 'neutral'>
}

export class GroqError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqError'
  }
}

const MODEL = 'llama-3.3-70b-versatile'
const MAX_TOKENS = 512

const SYSTEM_PROMPT = `You are a fact-checking assistant. Given a claim and summaries from web sources, assess how well the evidence supports or refutes the claim.

Always respond with valid JSON in this exact shape:
{
  "confidence": 0.85,
  "direction": "supports",
  "reasoning": "2-3 sentences explaining why the evidence supports or refutes the claim.",
  "citationRelevance": ["supports", "refutes", "neutral"]
}

Rules:
- confidence: 0.0 (no evidence) to 1.0 (overwhelming evidence)
- direction: "supports" if evidence favours the claim, "refutes" if evidence contradicts it
- citationRelevance: one entry per source in the same order provided; each must be "supports", "refutes", or "neutral"
- No markdown, no extra fields`

export async function getVerdict(
  claim: string,
  sources: Array<{ title: string; summary: string; url: string }>,
): Promise<VerdictResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not configured')

  const sourcesText = sources
    .map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.summary}`)
    .join('\n\n')

  const userContent = `Claim: ${claim}\n\nSources:\n${sourcesText}`

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new GroqError(`Network error calling Groq: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new GroqError(`Groq returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new GroqError('Groq returned empty response')

  let parsed: VerdictResult
  try {
    parsed = JSON.parse(content) as VerdictResult
  } catch {
    throw new GroqError('Verdict synthesis failed: invalid JSON response')
  }

  if (
    typeof parsed.confidence !== 'number' ||
    !['supports', 'refutes'].includes(parsed.direction) ||
    typeof parsed.reasoning !== 'string' ||
    !Array.isArray(parsed.citationRelevance)
  ) {
    throw new GroqError('Verdict synthesis failed: unexpected response shape')
  }

  return parsed
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agents/factcheck && npm test -- tests/groq.test.ts
```

Expected: 5 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add agents/factcheck/lib/groq.ts agents/factcheck/tests/groq.test.ts
git commit -m "feat(factcheck): add Groq verdict client with tests"
```

---

## Task 5: Search and Scout clients

**Files:**
- Create: `agents/factcheck/lib/search-client.ts`
- Create: `agents/factcheck/lib/scout-client.ts`

- [ ] **Step 1: Write `agents/factcheck/lib/search-client.ts`**

```ts
// lib/search-client.ts
// Calls Search agent's search skill over SAMVAD (lightweight mode).

const SEARCH_URL = 'https://samvad-agents-search.vercel.app/agent/message'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  score: number
}

export class SearchAgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SearchAgentError'
  }
}

export async function callSearchAgent(query: string, limit = 3): Promise<SearchResult[]> {
  let res: Response
  try {
    res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'search',
        payload: { query, limit },
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (e) {
    throw new SearchAgentError(`Network error calling Search agent: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new SearchAgentError(`Search agent returned HTTP ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    status: string
    result?: { results?: SearchResult[] }
  }

  if (data.status !== 'ok' || !data.result?.results) {
    throw new SearchAgentError('Search agent returned non-ok status')
  }

  return data.result.results
}
```

- [ ] **Step 2: Write `agents/factcheck/lib/scout-client.ts`**

```ts
// lib/scout-client.ts
// Calls Scout agent's summarizePage skill over SAMVAD (lightweight mode).

const SCOUT_URL = 'https://samvad-agents-scout.vercel.app/agent/message'

export interface ScoutSummary {
  title: string
  summary: string
  keyPoints: string[]
  url: string
}

export class ScoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScoutError'
  }
}

export async function callScoutSummarize(url: string, question: string): Promise<ScoutSummary> {
  let res: Response
  try {
    res = await fetch(SCOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'summarizePage',
        payload: { url, question },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new ScoutError(`Network error calling Scout for ${url}: ${String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ScoutError(`Scout returned HTTP ${res.status} for ${url}: ${text}`)
  }

  const data = await res.json() as {
    status: string
    result?: { title?: string; summary?: string; keyPoints?: string[]; url?: string }
  }

  if (data.status !== 'ok' || !data.result) {
    throw new ScoutError(`Scout returned non-ok status for ${url}`)
  }

  return {
    title: data.result.title ?? url,
    summary: data.result.summary ?? '',
    keyPoints: data.result.keyPoints ?? [],
    url: data.result.url ?? url,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add agents/factcheck/lib/search-client.ts agents/factcheck/lib/scout-client.ts
git commit -m "feat(factcheck): add Search and Scout clients"
```

---

## Task 6: factCheck skill (TDD)

**Files:**
- Create: `agents/factcheck/tests/factCheck.test.ts` (first)
- Create: `agents/factcheck/lib/skills/factCheck.ts`

- [ ] **Step 1: Write the failing tests in `agents/factcheck/tests/factCheck.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/search-client', () => ({
  callSearchAgent: vi.fn(),
  SearchAgentError: class SearchAgentError extends Error {
    constructor(msg: string) { super(msg); this.name = 'SearchAgentError' }
  },
}))

vi.mock('../lib/scout-client', () => ({
  callScoutSummarize: vi.fn(),
  ScoutError: class ScoutError extends Error {
    constructor(msg: string) { super(msg); this.name = 'ScoutError' }
  },
}))

vi.mock('../lib/groq', () => ({
  getVerdict: vi.fn(),
  GroqError: class GroqError extends Error {
    constructor(msg: string) { super(msg); this.name = 'GroqError' }
  },
}))

const { factCheck, FactCheckError } = await import('../lib/skills/factCheck')
import * as searchMod from '../lib/search-client'
import * as scoutMod from '../lib/scout-client'
import * as groqMod from '../lib/groq'

const SEARCH_RESULTS = [
  { title: 'Source A', url: 'https://a.com', snippet: '...', score: 0.9 },
  { title: 'Source B', url: 'https://b.com', snippet: '...', score: 0.8 },
  { title: 'Source C', url: 'https://c.com', snippet: '...', score: 0.7 },
]

function mockScout(url: string, title: string) {
  return { title, summary: `Summary of ${title}`, keyPoints: ['point 1'], url }
}

describe('factCheck', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns "supported" when confidence ≥ 0.75 and direction is supports', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.9,
      direction: 'supports',
      reasoning: 'Strong evidence.',
      citationRelevance: ['supports', 'supports', 'neutral'],
    })

    const result = await factCheck({ claim: 'Water is wet' })
    expect(result.label).toBe('supported')
    expect(result.confidence).toBe(0.9)
    expect(result.citations).toHaveLength(3)
    expect(result.agentCalls).toBe(4) // 1 search + 3 scout
  })

  it('returns "refuted" when confidence ≥ 0.75 and direction is refutes', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.8,
      direction: 'refutes',
      reasoning: 'Evidence contradicts.',
      citationRelevance: ['refutes', 'refutes', 'neutral'],
    })

    const result = await factCheck({ claim: 'The sky is green' })
    expect(result.label).toBe('refuted')
    expect(result.confidence).toBe(0.8)
  })

  it('returns "disputed" when 0.40 ≤ confidence < 0.75', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.55,
      direction: 'supports',
      reasoning: 'Mixed evidence.',
      citationRelevance: ['supports', 'neutral', 'refutes'],
    })

    const result = await factCheck({ claim: 'Contested claim' })
    expect(result.label).toBe('disputed')
  })

  it('returns "unverifiable" when confidence < 0.40', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.2,
      direction: 'supports',
      reasoning: 'Very little evidence.',
      citationRelevance: ['neutral', 'neutral', 'neutral'],
    })

    const result = await factCheck({ claim: 'Obscure claim' })
    expect(result.label).toBe('unverifiable')
  })

  it('returns "unverifiable" with confidence 0 when only 1 Scout call succeeds', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))

    const result = await factCheck({ claim: 'Some claim' })
    expect(result.label).toBe('unverifiable')
    expect(result.confidence).toBe(0)
    expect(groqMod.getVerdict).not.toHaveBeenCalled()
  })

  it('throws FactCheckError when Search agent fails', async () => {
    vi.mocked(searchMod.callSearchAgent).mockRejectedValue(
      new searchMod.SearchAgentError('connection refused')
    )
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('throws FactCheckError when all Scout calls fail', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize).mockRejectedValue(new scoutMod.ScoutError('timeout'))
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('throws FactCheckError when Groq fails', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockRejectedValue(new groqMod.GroqError('rate limited'))
    await expect(factCheck({ claim: 'Some claim' })).rejects.toThrow(FactCheckError)
  })

  it('appends context to search query when provided', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockResolvedValueOnce(mockScout('https://c.com', 'Source C'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.85,
      direction: 'supports',
      reasoning: 'Supported.',
      citationRelevance: ['supports', 'supports', 'neutral'],
    })

    await factCheck({ claim: 'Some claim', context: 'in 2024' })
    expect(searchMod.callSearchAgent).toHaveBeenCalledWith('Some claim in 2024', 3)
  })

  it('counts agentCalls correctly when 2 of 3 Scout calls succeed', async () => {
    vi.mocked(searchMod.callSearchAgent).mockResolvedValue(SEARCH_RESULTS)
    vi.mocked(scoutMod.callScoutSummarize)
      .mockResolvedValueOnce(mockScout('https://a.com', 'Source A'))
      .mockResolvedValueOnce(mockScout('https://b.com', 'Source B'))
      .mockRejectedValueOnce(new scoutMod.ScoutError('timeout'))
    vi.mocked(groqMod.getVerdict).mockResolvedValue({
      confidence: 0.9,
      direction: 'supports',
      reasoning: 'Supported.',
      citationRelevance: ['supports', 'supports'],
    })

    const result = await factCheck({ claim: 'Some claim' })
    expect(result.agentCalls).toBe(3) // 1 search + 2 scout successes
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agents/factcheck && npm test -- tests/factCheck.test.ts
```

Expected: FAIL — `Cannot find module '../lib/skills/factCheck'`

- [ ] **Step 3: Write `agents/factcheck/lib/skills/factCheck.ts`**

```ts
// lib/skills/factCheck.ts
import { callSearchAgent, SearchAgentError } from '../search-client'
import { callScoutSummarize, ScoutError } from '../scout-client'
import { getVerdict, GroqError } from '../groq'

export interface FactCheckInput {
  claim: string
  context?: string
}

export interface FactCheckOutput {
  claim: string
  confidence: number
  label: 'supported' | 'refuted' | 'disputed' | 'unverifiable'
  reasoning: string
  citations: Array<{
    url: string
    title: string
    relevance: 'supports' | 'refutes' | 'neutral'
  }>
  agentCalls: number
}

export class FactCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FactCheckError'
  }
}

const SOURCES_TO_FETCH = 3

function deriveLabel(
  confidence: number,
  direction: 'supports' | 'refutes',
  sourceCount: number,
): FactCheckOutput['label'] {
  if (sourceCount < 2) return 'unverifiable'
  if (confidence >= 0.75) return direction === 'supports' ? 'supported' : 'refuted'
  if (confidence >= 0.40) return 'disputed'
  return 'unverifiable'
}

export async function factCheck(input: unknown): Promise<FactCheckOutput> {
  const { claim, context } = input as FactCheckInput
  if (!claim?.trim()) throw new FactCheckError('claim is required')

  let agentCalls = 0

  // 1. Search
  const searchQuery = context ? `${claim} ${context}` : claim
  let urls: string[]
  try {
    const results = await callSearchAgent(searchQuery, SOURCES_TO_FETCH)
    urls = results.map(r => r.url)
    agentCalls++
  } catch (e) {
    if (e instanceof SearchAgentError) {
      throw new FactCheckError(`Search agent unavailable: ${e.message}`)
    }
    throw e
  }

  if (urls.length === 0) {
    return {
      claim,
      confidence: 0,
      label: 'unverifiable',
      reasoning: 'No sources were found for this claim.',
      citations: [],
      agentCalls,
    }
  }

  // 2. Scout each URL concurrently
  const sources: Array<{ title: string; summary: string; url: string }> = []

  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const result = await callScoutSummarize(url, claim)
        sources.push({ title: result.title, summary: result.summary, url })
        agentCalls++
      } catch (e) {
        if (!(e instanceof ScoutError)) throw e
        // Skip failed Scout calls
      }
    })
  )

  if (sources.length === 0) {
    throw new FactCheckError('All Scout calls failed — no sources to evaluate')
  }

  if (sources.length < 2) {
    return {
      claim,
      confidence: 0,
      label: 'unverifiable',
      reasoning: 'Insufficient sources were available to verify this claim.',
      citations: sources.map(s => ({ url: s.url, title: s.title, relevance: 'neutral' as const })),
      agentCalls,
    }
  }

  // 3. Groq verdict
  let verdict
  try {
    verdict = await getVerdict(claim, sources)
  } catch (e) {
    if (e instanceof GroqError) {
      throw new FactCheckError(`Verdict synthesis failed: ${e.message}`)
    }
    throw e
  }

  const citations: FactCheckOutput['citations'] = sources.map((s, i) => ({
    url: s.url,
    title: s.title,
    relevance: verdict.citationRelevance[i] ?? 'neutral',
  }))

  return {
    claim,
    confidence: verdict.confidence,
    label: deriveLabel(verdict.confidence, verdict.direction, sources.length),
    reasoning: verdict.reasoning,
    citations,
    agentCalls,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agents/factcheck && npm test -- tests/factCheck.test.ts
```

Expected: 10 tests passing, 0 failing.

- [ ] **Step 5: Run all tests**

```bash
cd agents/factcheck && npm test
```

Expected: 15 tests passing (5 groq + 10 factCheck), 0 failing.

- [ ] **Step 6: Commit**

```bash
git add agents/factcheck/lib/skills/factCheck.ts agents/factcheck/tests/factCheck.test.ts
git commit -m "feat(factcheck): add factCheck skill with full test suite"
```

---

## Task 7: Protocol middleware and HTTP routes

**Files:**
- Create: `agents/factcheck/lib/protocol.ts`
- Create: `agents/factcheck/app/agent/message/route.ts`
- Create: `agents/factcheck/app/agent/health/route.ts`
- Create: `agents/factcheck/app/.well-known/agent.json/route.ts`
- Create: `agents/factcheck/app/layout.tsx`
- Create: `agents/factcheck/app/page.tsx`

- [ ] **Step 1: Write `agents/factcheck/lib/protocol.ts`**

```ts
// lib/protocol.ts
// SAMVAD protocol verification — thin wrapper around SDK's createVerifyMiddleware.

import { NextResponse } from 'next/server'
import { createVerifyMiddleware } from '@samvad-protocol/sdk'
import type { VerifyResult } from '@samvad-protocol/sdk'
import { checkRateLimit } from './rate-limiter'
import { AGENT_CARD } from './card'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Digest, Signature-Input, Signature',
}

const verify = createVerifyMiddleware({
  agentId: AGENT_CARD.id,
  skills: AGENT_CARD.skills,
  rateLimiter: (ip) => checkRateLimit(ip),
})

export type { VerifiedRequest } from '@samvad-protocol/sdk'

export type WrappedVerifyResult =
  | { ok: true; data: { envelope: import('@samvad-protocol/sdk').MessageEnvelope; spanId: string } }
  | { ok: false; response: NextResponse }

export async function verifyIncoming(
  method: string,
  path: string,
  bodyBytes: Uint8Array,
  headers: Headers,
  clientIp: string,
): Promise<WrappedVerifyResult> {
  const result: VerifyResult = await verify(method, path, bodyBytes, headers, clientIp)
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          status: 'error',
          error: { code: result.error.code, message: result.error.message },
          ...(result.error.traceId && { traceId: result.error.traceId }),
        },
        { status: result.error.status, headers: CORS_HEADERS },
      ),
    }
  }
  return result
}
```

- [ ] **Step 2: Write `agents/factcheck/app/agent/message/route.ts`**

```ts
// app/agent/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { factCheck } from '@/lib/skills/factCheck'
import { verifyIncoming, CORS_HEADERS } from '@/lib/protocol'

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  factCheck: factCheck,
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const bodyBytes = new Uint8Array(await req.arrayBuffer())
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const result = await verifyIncoming('POST', '/agent/message', bodyBytes, req.headers, ip)
  if (!result.ok) return result.response

  const { envelope, spanId } = result.data

  const handler = handlers[envelope.skill]
  if (!handler) {
    return NextResponse.json(
      {
        traceId: envelope.traceId,
        spanId,
        status: 'error',
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Unknown skill: ${envelope.skill}. Available: ${Object.keys(handlers).join(', ')}`,
        },
      },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  try {
    const res = await handler(envelope.payload)
    return NextResponse.json(
      { traceId: envelope.traceId, spanId, status: 'ok', result: res },
      { headers: CORS_HEADERS },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        traceId: envelope.traceId,
        spanId,
        status: 'error',
        error: { code: 'AGENT_UNAVAILABLE', message },
      },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
```

- [ ] **Step 3: Write `agents/factcheck/app/agent/health/route.ts`**

```ts
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

export function GET() {
  return NextResponse.json(
    { status: 'ok', agent: 'factcheck', protocolVersion: '1.2' },
    { headers: CORS_HEADERS },
  )
}
```

- [ ] **Step 4: Write `agents/factcheck/app/.well-known/agent.json/route.ts`**

```ts
// app/.well-known/agent.json/route.ts
import { NextResponse } from 'next/server'
import { getAgentCard } from '@/lib/card'

export async function GET() {
  const card = await getAgentCard()
  return NextResponse.json(card, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
```

- [ ] **Step 5: Write `agents/factcheck/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FactCheck — SAMVAD Agent',
  description: 'Checks claims against live web sources. A SAMVAD protocol agent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Write `agents/factcheck/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>FactCheck</h1>
      <p>A SAMVAD protocol agent. This is an API endpoint, not a web app.</p>
      <ul>
        <li><a href="/.well-known/agent.json">Agent Card</a></li>
        <li><a href="/agent/health">Health</a></li>
      </ul>
      <p>Skill: <code>factCheck(claim, context?)</code></p>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add agents/factcheck/lib/protocol.ts \
        agents/factcheck/app/agent/message/route.ts \
        agents/factcheck/app/agent/health/route.ts \
        agents/factcheck/app/.well-known/agent.json/route.ts \
        agents/factcheck/app/layout.tsx \
        agents/factcheck/app/page.tsx
git commit -m "feat(factcheck): add protocol middleware and HTTP routes"
```

---

## Task 8: Build verification and deploy

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

```bash
cd agents/factcheck && npm test
```

Expected: 15 tests passing, 0 failing.

- [ ] **Step 2: Run the build**

```bash
cd agents/factcheck && npm run build
```

Expected: Compiled successfully. No type errors.

- [ ] **Step 3: Generate a private key for deployment**

```bash
node -e "import('crypto').then(c => console.log(c.randomBytes(32).toString('base64')))"
```

Copy the output. This is the value for the `SAMVAD_PRIVATE_KEY` environment variable on Vercel.

- [ ] **Step 4: Deploy to Vercel**

```bash
cd agents/factcheck && npx vercel --prod
```

Set environment variables when prompted (or in Vercel dashboard before deploying):
- `SAMVAD_PRIVATE_KEY` — the base64 key from Step 3
- `GROQ_API_KEY` — your Groq API key

- [ ] **Step 5: Verify the deployed agent**

```bash
# Health check
curl https://samvad-agents-factcheck.vercel.app/agent/health

# Expected:
# {"status":"ok","agent":"factcheck","protocolVersion":"1.2"}

# Agent card
curl https://samvad-agents-factcheck.vercel.app/.well-known/agent.json | jq '.name, .skills[0].id'

# Expected:
# "FactCheck"
# "factCheck"
```

- [ ] **Step 6: Register with the SAMVAD registry**

```bash
curl -X POST https://samvadprotocol.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"cardUrl":"https://samvad-agents-factcheck.vercel.app/.well-known/agent.json"}'
```

Expected: `{"success":true}`

- [ ] **Step 7: Final commit**

```bash
git add agents/factcheck/
git commit -m "feat(factcheck): FactCheck agent — confidence score, verdict label, citations"
```

---

## Self-review against spec

| Spec requirement | Covered by |
|-----------------|-----------|
| `factCheck` skill with `claim` + optional `context` | Task 3 card, Task 6 skill |
| Output: `confidence`, `label`, `reasoning`, `citations`, `agentCalls` | Task 6 |
| Label derivation from confidence + direction + source count | Task 6 `deriveLabel()` |
| Calls Search agent over SAMVAD | Task 5 search-client, Task 6 |
| Calls Scout agent over SAMVAD | Task 5 scout-client, Task 6 |
| Groq `llama-3.3-70b-versatile`, temperature 0 | Task 4 |
| Skip failed Scout calls, throw if all fail | Task 6 |
| `unverifiable` when < 2 sources | Task 6 |
| Public trust tier | Task 3 card |
| `context` appended to search query | Task 6 + test |
| `agentCalls` count | Task 6 + test |
| All 10 test cases from spec §5 | Task 6 tests |
