// lib/openclaw.ts
// Thin client for forwarding messages to an OpenClaw Gateway webhook.

export interface OpenClawResponse {
  reply: string
  channel: string
}

export async function callOpenClaw(
  message: string,
  channel = 'samvad',
): Promise<OpenClawResponse> {
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL
  const hookToken = process.env.OPENCLAW_HOOK_TOKEN

  if (!webhookUrl) {
    throw new Error('OPENCLAW_WEBHOOK_URL is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (hookToken) {
    headers['Authorization'] = `Bearer ${hookToken}`
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, channel }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`OpenClaw webhook returned ${res.status}: ${text}`)
  }

  const data = await res.json() as { reply?: string; text?: string; message?: string }

  // OpenClaw webhooks can return different shapes depending on version/config.
  // Normalise to { reply, channel }.
  const reply = data.reply ?? data.text ?? data.message ?? ''
  return { reply, channel }
}
