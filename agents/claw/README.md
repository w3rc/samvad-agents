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

Add this to your OpenClaw `config.yaml` to enable the webhook:

```yaml
hooks:
  enabled: true
  path: /hooks
  token: your-secret-token
```

## Deploy

```bash
cd agents/claw
vercel --prod
```

Set `OPENCLAW_WEBHOOK_URL` and `OPENCLAW_HOOK_TOKEN` in Vercel environment variables, then register:

```bash
curl -X POST https://samvadprotocol.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"url": "https://samvad-agents-claw.vercel.app"}'
```
