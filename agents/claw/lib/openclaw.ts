// lib/openclaw.ts
// Client for the OpenClaw Gateway's OpenAI-compatible /v1/chat/completions endpoint.
// Auth: gateway token (OPENCLAW_GATEWAY_TOKEN) + x-openclaw-scopes: operator.write header.

export interface OpenClawResponse {
  reply: string
  channel: string
}

export async function callOpenClaw(
  message: string,
  channel = 'samvad',
): Promise<OpenClawResponse> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN

  if (!gatewayUrl) throw new Error('OPENCLAW_GATEWAY_URL is not configured')
  if (!gatewayToken) throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')

  const url = `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayToken}`,
      'x-openclaw-scopes': 'operator.write',
      'x-openclaw-message-channel': channel,
    },
    body: JSON.stringify({
      model: 'openclaw',
      messages: [{ role: 'user', content: message }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`OpenClaw gateway returned ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const reply = data.choices?.[0]?.message?.content ?? ''
  return { reply, channel }
}
