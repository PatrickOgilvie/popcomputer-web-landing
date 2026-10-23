import type { D1Database, Queue, RateLimit, SendEmail } from '@cloudflare/workers-types'
import { Schema as S } from 'effect'
import { defineEnv, secret, variable, type EnvBindings } from '@popcomputer/web/env'
import type { LeadEmail } from './leads'

/**
 * The Worker's vars and secrets, each declared once. The Worker checks them
 * before it serves, `bun run env:check` checks them locally and on
 * Cloudflare, and `bun run deploy` won't deploy without them.
 */
export const env = defineEnv({
  /** `bun run dev` sets development, wrangler.jsonc production, and the tests test. */
  ENVIRONMENT: variable(S.Literals(['development', 'production', 'test'])),
  /**
   * Checks the token Turnstile's widget gives each visitor. Turnstile issues
   * it with the widget's site key; locally, .dev.vars holds Cloudflare's test
   * secret, which passes every token.
   */
  TURNSTILE_SECRET: secret(),
  /** The address the owner's emails come from, on a domain onboarded to Email Sending. */
  LEADS_FROM: variable(S.String.check(S.isPattern(/^[^\s@]+@[^\s@]+$/))),
  /** The owner's address: the OWNER_EMAIL binding's destination_address, its only one. */
  LEADS_TO: variable(S.String.check(S.isPattern(/^[^\s@]+@[^\s@]+$/))),
})

/** The Worker's bindings: the vars and secrets above, and those wrangler.jsonc declares. */
export type Bindings = EnvBindings<typeof env> & {
  DB: D1Database
  /** Counts each address's messages, at Cloudflare's edge. */
  LEAD_LIMITER: RateLimit
  /** Carries each new lead to the Worker's queue consumer, which emails the owner. */
  LEAD_EMAILS: Queue<typeof LeadEmail.Type>
  /** Sends only to the owner: wrangler.jsonc gives it LEADS_TO as its one destination_address. */
  OWNER_EMAIL: SendEmail
}

export type Env = { Bindings: Bindings }
