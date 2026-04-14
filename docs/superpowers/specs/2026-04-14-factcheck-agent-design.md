# FactCheck Agent — Design Spec

**Goal:** A SAMVAD agent that accepts a claim string and returns a confidence score, verdict label, reasoning, and citations — by orchestrating Search and Scout agents over SAMVAD and synthesizing with Groq.

**Architecture:** Search (Tavily) → Scout (Jina) × N → Groq verdict. Follows the Research agent pattern exactly.

**Tech Stack:** Next.js 16, `@samvad-protocol/sdk` ^0.5.0, Groq (`llama-3.3-70b-versatile`), deployed on Vercel.

---

## §1 — Skill Interface

### `factCheck`

**Input:**
```ts
{
  claim: string      // statement to verify, e.g. "The Eiffel Tower is in Berlin"
  context?: string   // optional background to sharpen search queries
}
```

**Output:**
```ts
{
  claim: string
  confidence: number          // 0.0–1.0 (Groq-produced)
  label: "supported"          // confidence ≥ 0.75, direction = "supports"
       | "refuted"            // confidence ≥ 0.75, direction = "refutes"
       | "disputed"           // 0.40 ≤ confidence < 0.75
       | "unverifiable"       // confidence < 0.40 OR fewer than 2 sources available
  reasoning: string           // 2–3 sentences explaining the verdict
  citations: Array<{
    url: string
    title: string
    relevance: "supports" | "refutes" | "neutral"
  }>
  agentCalls: number          // total SAMVAD hops made
}
```

**Label derivation (code, not Groq):**
```
if sources < 2                       → "unverifiable", confidence = 0
else if confidence >= 0.75
  direction === "supports"           → "supported"
  direction === "refutes"            → "refuted"
else if confidence >= 0.40           → "disputed"
else                                 → "unverifiable"
```

Trust tier: `public` — no auth required.

---

## §2 — Architecture & File Structure

```
agents/factcheck/
  lib/
    card.ts            AgentCard — id, name, url, skills, publicKey
    keys.ts            load/generate Ed25519 keypair from .samvad/keys/
    protocol.ts        createVerifyMiddleware wrapper (same pattern as scout/research)
    rate-limiter.ts    sliding-window per IP (same pattern as scout/research)
    groq.ts            verdict LLM call → { confidence, direction, reasoning, citationRelevance[] }
    search-client.ts   calls Search agent POST /agent/message → SearchResult[]
    scout-client.ts    calls Scout agent POST /agent/message → SummarizePageOutput
    skills/
      factCheck.ts     orchestrates search → scout × N → groq → map label → output
  app/
    agent/
      message/route.ts     POST /agent/message (sync mode)
      health/route.ts      GET /agent/health
    .well-known/
      agent.json/route.ts  serves AgentCard JSON
    page.tsx               minimal landing page (same style as other agents)
  tests/
    factCheck.test.ts      unit tests with mocked clients
  package.json
  vercel.json
  tsconfig.json
```

**Constants:**
```ts
const SEARCH_AGENT_URL = 'https://samvad-agents-search.vercel.app/agent/message'
const SCOUT_AGENT_URL  = 'https://samvad-agents-scout.vercel.app/agent/message'
const SOURCES_TO_FETCH = 3   // search results → scout calls
```

**Orchestration flow in `factCheck.ts`:**
1. Call Search agent with `claim` (appended with `context` if provided) → up to 3 URLs
2. Call Scout `summarizePage` for each URL concurrently → collect summaries
3. If fewer than 2 summaries succeed → return `unverifiable` immediately
4. Feed claim + summaries to Groq → `{ confidence, direction, reasoning, citationRelevance[] }`
5. Map direction × confidence → label
6. Return full output

---

## §3 — Groq Prompt

**System:**
```
You are a fact-checking assistant. Given a claim and summaries from web sources,
assess how well the evidence supports or refutes the claim.

Respond with valid JSON in this exact shape:
{
  "confidence": 0.85,
  "direction": "supports",
  "reasoning": "2-3 sentences explaining why the evidence supports or refutes the claim.",
  "citationRelevance": ["supports", "refutes", "neutral"]
}

Rules:
- confidence: 0.0 (no evidence) to 1.0 (overwhelming evidence)
- direction: "supports" if evidence favours the claim, "refutes" if evidence contradicts it
- citationRelevance: one entry per source, in the same order as provided
- No markdown, no extra fields
```

**User message:**
```
Claim: <claim>

Sources:
[1] <title> (<url>)
<summary>

[2] ...
```

Model: `llama-3.3-70b-versatile`. Max tokens: 512. Temperature: 0.

---

## §4 — Error Handling

| Failure | Behaviour |
|---------|-----------|
| Search agent unavailable | Throw `FactCheckError('Search agent unavailable')` |
| Scout fails for one URL | Skip that source, continue with rest |
| All Scout calls fail | Throw `FactCheckError('All Scout calls failed')` |
| Fewer than 2 sources | Return `unverifiable`, confidence 0, reasoning explains lack of sources |
| Groq returns invalid JSON | Throw `FactCheckError('Verdict synthesis failed: invalid response')` |
| Groq API error | Throw `FactCheckError('Verdict synthesis failed: <message>')` |

---

## §5 — Tests (`tests/factCheck.test.ts`)

All external calls (Search, Scout, Groq) are mocked.

| Test | What it checks |
|------|---------------|
| Happy path — supported | 3 sources, confidence 0.9, direction "supports" → label "supported" |
| Happy path — refuted | 3 sources, confidence 0.8, direction "refutes" → label "refuted" |
| Disputed | confidence 0.55 → label "disputed" |
| Unverifiable — low confidence | confidence 0.3 → label "unverifiable" |
| Unverifiable — only 1 source | 1 Scout success → label "unverifiable", confidence 0 |
| All Scout calls fail | throws FactCheckError |
| Search agent down | throws FactCheckError |
| Groq invalid JSON | throws FactCheckError |
| agentCalls count | 1 (search) + N (scout successes) = correct total |
| context is appended to search query | search called with "claim context" |

---

## §6 — Deployment

- Vercel project: `samvad-agents-factcheck`
- Env vars: `GROQ_API_KEY`, `AGENT_PRIVATE_KEY` (or key file mounted at `.samvad/keys/`)
- `vercel.json`: same shape as other agents (no special config needed)
- Register with the SAMVAD registry after deploy via `POST /api/register` on samvadprotocol.vercel.app

---

## Out of Scope

- Streaming mode — `factCheck` is sync only; the pipeline completes in ~5s
- Async/task mode — not needed for this use case
- Devil's advocate second pass — future enhancement
- Source deduplication — Tavily handles this
