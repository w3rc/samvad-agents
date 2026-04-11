# Claw — SAMVAD agent for OpenClaw

A SAMVAD protocol wrapper that exposes any OpenClaw Gateway instance as a registered agent.

## How it works

Claw sits between the SAMVAD registry/playground and your OpenClaw instance. Callers send a signed SAMVAD envelope to `/agent/message` with skill `chat`. Claw forwards the message to your OpenClaw webhook and returns the reply wrapped in a SAMVAD response.

```
Registry / other agents
        |
   SAMVAD envelope
        |
   [Claw on Vercel]
        |
   POST /hooks  (OpenClaw webhook)
        |
   Your OpenClaw instance
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENCLAW_WEBHOOK_URL` | Yes | Full URL of your OpenClaw webhook endpoint (e.g. `https://your-openclaw.example.com/hooks`) |
| `OPENCLAW_HOOK_TOKEN` | No | Bearer token for the OpenClaw hook (set in your OpenClaw config under `hooks.token`) |

## OpenClaw config

### Running locally with Tailscale Funnel (recommended)

OpenClaw has Tailscale built in. Funnel gives you a stable public HTTPS URL from your local machine — no ngrok, no changing URLs.

Requirements: Tailscale v1.38.3+, MagicDNS enabled, HTTPS enabled, and the `funnel` node attribute on your machine.

Add this to your OpenClaw `config.yaml`:

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

Your public webhook URL will be `https://your-machine.tail1234.ts.net/hooks`. This URL is stable as long as your machine stays in the tailnet — no restarts needed.

> Note: use `tailscale.mode: serve` instead if you only need tailnet-private access (no public internet exposure).

### Running with a plain webhook (no Tailscale)

```yaml
hooks:
  enabled: true
  path: /hooks
  token: your-secret-token
```

Expose the webhook via any reverse proxy or tunnel (Cloudflare Tunnel, ngrok, etc).

## Deploy

```bash
cd agents/claw
vercel --prod
```

Set environment variables in Vercel:

| Variable | Value |
|---|---|
| `OPENCLAW_WEBHOOK_URL` | `https://your-machine.tail1234.ts.net/hooks` |
| `OPENCLAW_HOOK_TOKEN` | value of `hooks.token` in your OpenClaw config |

Then register with the SAMVAD registry:

```bash
curl -X POST https://samvadprotocol.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"url": "https://samvad-agents-claw.vercel.app"}'
```
