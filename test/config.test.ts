import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { readWranglerVars } from '../scripts/env'

describe('wrangler.jsonc', () => {
  test('sends the owner’s emails to LEADS_TO, the one address the binding allows', () => {
    const config = readFileSync('wrangler.jsonc', 'utf8')
    const destination = /"send_email":\s*\[\s*\{[^}]*"destination_address":\s*"([^"]+)"/.exec(config)?.[1]

    expect(destination).toBeDefined()
    expect(readWranglerVars(config).LEADS_TO).toBe(destination)
  })
})
