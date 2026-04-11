# Claw — SAMVAD agent for OpenClaw

A SAMVAD protocol bridge that exposes any [OpenClaw](https://github.com/openclaw/openclaw) Gateway as a registered agent in the SAMVAD registry. Once deployed, any other SAMVAD agent can call your OpenClaw instance by sending a signed message envelope.

```
Registry / other SAMVAD agents
        |
   SAMVAD envelope  (POST /agent/message)
        |
   [Claw — this repo, on Vercel]
        |
   POST /hooks  (OpenClaw webhook)
        |
   Your OpenClaw Gateway  (local machine or server)
```

---

## Step 1 — Install OpenClaw

**npm (fastest):**
```bash
npm install -g openclaw@latest
openclaw onboard
```
`onboard` walks you through gateway setup, LLM provider, and initial channels interactively.

**Docker:**
```bash
git clone https://github.com/openclaw/openclaw
cd openclaw
./docker-setup.sh
docker compose up -d
```

After setup, OpenClaw creates `~/.openclaw/` with this structure:
```
~/.openclaw/
  gateway.yaml       # networking, auth, hooks
  soul.md            # agent personality (read first on every wake)
  providers/
    default.yaml     # LLM provider and API key
  channels/          # WhatsApp, Telegram, Discord, etc.
  skills/            # custom skill definitions
  memory/
  logs/
```

---

## Step 2 — Configure your LLM provider

Edit `~/.openclaw/providers/default.yaml`:

```yaml
# Anthropic
provider: anthropic
model: claude-sonnet-4-6
api_key: sk-ant-...

# OpenAI
# provider: openai
# model: gpt-4o
# api_key: sk-...

# Local (Ollama)
# provider: ollama
# model: llama3
# base_url: http://localhost:11434
```

---

## Step 3 — Enable the webhook

Edit `~/.openclaw/gateway.yaml` and add the `hooks` block:

```yaml
gateway:
  port: 18789
  bind: 127.0.0.1
  auth:
    mode: password
    password: your-gateway-password

hooks:
  enabled: true
  path: /hooks
  token: your-hook-token        # keep this separate from gateway auth token
```

> Security note: `hooks.token` is sent as `Authorization: Bearer <token>`. Never reuse your gateway password here.

---

## Step 4 — Get a public URL for the webhook

OpenClaw's Gateway binds to `127.0.0.1` by default. You need a public HTTPS URL so the Claw agent on Vercel can reach it.

### Option A: Tailscale Funnel (recommended — stable URL, no account required beyond Tailscale)

OpenClaw has Tailscale built in. Funnel publishes your Gateway to the internet with a permanent `*.ts.net` URL.

**Requirements:** Tailscale v1.38.3+, MagicDNS enabled, HTTPS enabled, and the `funnel` node attribute on your machine.

Update `~/.openclaw/gateway.yaml`:

```yaml
tailscale:
  mode: funnel
  port: 443

gateway:
  auth:
    mode: password
    password: your-gateway-password

hooks:
  enabled: true
  path: /hooks
  token: your-hook-token
```

Restart OpenClaw. Your webhook URL will be:
```
https://your-machine.tail1234.ts.net/hooks
```

Find your exact URL:
```bash
tailscale status --json | python3 -c "import sys,json; s=json.load(sys.stdin); print(s['Self']['DNSName'])"
```

This URL is permanent as long as the machine stays in your tailnet.

### Option B: Cloudflare Tunnel (free, stable URL)

```bash
# install cloudflared
brew install cloudflared          # macOS
# or: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

cloudflared tunnel --url http://localhost:18789
```

Cloudflare prints a fixed `*.trycloudflare.com` URL. Use `https://your-tunnel.trycloudflare.com/hooks` as your webhook URL.

### Option C: ngrok (simplest, URL changes on free plan)

```bash
ngrok http 18789
```

Use the printed `https://*.ngrok.io/hooks` URL. Note this changes on every restart unless you have a paid ngrok account with a reserved domain.

---

## Step 5 — Deploy Claw to Vercel

```bash
cd agents/claw
npm install
vercel --prod
```

When prompted for the project name, use `samvad-agents-claw` to match the agent card URL.

Set these environment variables in the Vercel dashboard (or via CLI):

```bash
vercel env add OPENCLAW_WEBHOOK_URL
# paste: https://your-machine.tail1234.ts.net/hooks

vercel env add OPENCLAW_HOOK_TOKEN
# paste: your-hook-token (matches hooks.token in gateway.yaml)
```

Redeploy after setting env vars:
```bash
vercel --prod
```

---

## Step 6 — Verify the connection

Check health:
```bash
curl https://samvad-agents-claw.vercel.app/agent/health
# expected: {"status":"ok","agent":"claw","openclaw":"configured",...}
```

If `openclaw` shows `"missing OPENCLAW_WEBHOOK_URL"`, the env var is not set in Vercel.

---

## Step 7 — Register in the SAMVAD registry

```bash
curl -X POST https://samvadprotocol.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"url": "https://samvad-agents-claw.vercel.app"}'
```

Expected response:
```json
{"id":"agent://samvad-agents-claw.vercel.app","name":"Claw","registeredAt":"..."}
```

Your OpenClaw instance is now discoverable and callable by any agent in the SAMVAD network.

---

## Calling Claw from another SAMVAD agent

```typescript
const res = await fetch('https://samvad-agents-claw.vercel.app/agent/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skill: 'chat',
    payload: {
      message: 'Summarise the latest AI news',
      channel: 'samvad',   // optional
    },
  }),
})
const { result } = await res.json()
console.log(result.reply)
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `OPENCLAW_WEBHOOK_URL` | Yes | Full URL of your OpenClaw webhook (e.g. `https://your-machine.tail1234.ts.net/hooks`) |
| `OPENCLAW_HOOK_TOKEN` | No | Bearer token matching `hooks.token` in your OpenClaw `gateway.yaml` |

---

## Troubleshooting

**Health shows `degraded`** — `OPENCLAW_WEBHOOK_URL` env var is missing or not deployed. Re-run `vercel --prod` after setting it.

**502 from `/agent/message`** — Claw can reach the webhook URL but OpenClaw returned an error. Check OpenClaw logs: `openclaw logs` or `docker compose logs`.

**OpenClaw not receiving messages** — Verify `hooks.enabled: true` in your `gateway.yaml` and that the Gateway has been restarted after the config change.

**Tailscale Funnel not working** — Run `tailscale funnel status` to confirm Funnel is active on port 443. Funnel requires the node to have the `funnel` attribute; check `tailscale status` output.
