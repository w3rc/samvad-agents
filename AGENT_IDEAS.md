# Agent Ideas

Candidate agents to build on the SAMVAD protocol.

---

## 1. Search
Web search agent backed by Brave or Serper API. Skills: `search(query, limit)`, `searchNews(query, since)`. Returns ranked results with title, snippet, and URL. Useful as a building block for any agent that needs fresh information.

## 2. Digest
Aggregates multiple RSS feeds or URLs into a structured daily digest. Skills: `buildDigest(feeds[], date)`, `summarizeFeed(url)`. Pairs well with Scout for per-article summarization.

## 3. CodeReview
Reviews a GitHub PR or raw diff. Skills: `reviewPR(owner, repo, prNumber)`, `reviewDiff(diff)`. Returns structured feedback: issues by severity, suggested fixes, overall verdict. Uses Groq for fast inference.

## 4. Translator
Multilingual translation with language detection. Skills: `translate(text, targetLang)`, `detectLanguage(text)`. Supports 30+ languages via a Groq prompt with structured output.

## 5. DataExtract
Pulls structured data from any web page: prices, tables, lists, metadata. Skills: `extractTable(url)`, `extractPrice(url)`, `extractSchema(url, schema)`. Uses Jina Reader + LLM extraction.

## 6. ImageDescribe
Describes images and answers questions about them using a vision model. Skills: `describe(imageUrl)`, `ask(imageUrl, question)`. Backed by a vision-capable model (Llama 4 on Groq or GPT-4o).

## 7. FactCheck
Takes a claim and checks it against live web sources. Skills: `checkClaim(claim)`, `findSources(claim)`. Returns verdict (supported / disputed / unverifiable) with source citations.

## 8. Monitor
Uptime and health monitor for SAMVAD agents and arbitrary URLs. Skills: `checkHealth(agentId)`, `pingUrl(url)`, `batchCheck(urls[])`. Returns status, latency, and last-seen-healthy timestamp.

## 9. DocChat
Chat with a document or PDF via URL. Skills: `ingest(url)`, `ask(docId, question)`, `summarize(docId)`. Stores chunks in-memory per session, no persistent DB needed for a stateless Vercel deployment.

## 10. EmailDraft
Drafts emails given a context brief. Skills: `draft(to, subject, context)`, `replyDraft(originalEmail, replyContext)`. Returns subject line and body. No sending, just drafting, so no auth required.
