// lib/keys.ts
// Load the agent's Ed25519 keypair from environment variables.
// SAMVAD_PRIVATE_KEY: base64-encoded 32-byte Ed25519 private key
// On first deploy, generate one with:
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
    kid: 'translator-key-1',
    privateKey,
    publicKey,
    publicKeyBase64: encodePublicKey(publicKey),
  }
  return cached
}
