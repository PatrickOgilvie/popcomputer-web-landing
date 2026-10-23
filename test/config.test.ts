import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { readWranglerVars } from '../scripts/env'

describe('wrangler.jsonc', () => {
  const config = readFileSync('wrangler.jsonc', 'utf8')

  test('sends the owner’s emails from LEADS_FROM, the one sender the binding allows', () => {
    const senders = /"send_email":\s*\[\s*\{[^}]*"allowed_sender_addresses":\s*\[\s*"([^"]+)"\s*\]/.exec(config)?.[1]

    expect(senders).toBeDefined()
    expect(readWranglerVars(config).LEADS_FROM).toBe(senders)
  })

  test('keeps the owner’s address out of the code: LEADS_TO is a secret', () => {
    expect(readWranglerVars(config)).not.toHaveProperty('LEADS_TO')
  })
})
