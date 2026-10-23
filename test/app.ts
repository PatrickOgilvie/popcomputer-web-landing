import type { EmailMessageBuilder, Queue, SendEmail } from '@cloudflare/workers-types'
import { Effect, Layer } from 'effect'
import { testBatch, testEnv, testRateLimiter } from '@popcomputer/web/testing'
import { app } from '../src/app'
import { Turnstile, type LeadEmail } from '../src/leads'
import worker from '../src/worker'
import { databases } from './databases'
import '../src/routes'

export { app }

/** The token the fake Turnstile accepts: any other is a bot's. */
export const personToken = 'a-person-solved-this'

/** Turnstile, standing in: it never leaves the test. */
export const fakeTurnstile = Layer.succeed(
  Turnstile,
  Turnstile.of({ verify: ({ token }) => Effect.succeed(token === personToken) })
)

/**
 * The Worker's bindings, with a new, empty D1 database, a queue that keeps
 * what it's sent, and an owner's inbox that keeps each email, or refuses
 * them all while `inbox.down` holds.
 */
export async function landing(layer: Layer.Layer<never> = Layer.empty) {
  const queued: Array<typeof LeadEmail.Type> = []
  const inbox = { emails: [] as Array<EmailMessageBuilder>, down: false }

  const queue = {
    send: async (body: typeof LeadEmail.Type) => {
      queued.push(body)
    },
  }
  const ownerEmail = {
    send: async (message: EmailMessageBuilder) => {
      if (inbox.down) throw Object.assign(new Error('Email Service is unavailable.'), { code: 'E_INTERNAL_SERVER_ERROR' })
      inbox.emails.push(message)
      return { messageId: `message-${inbox.emails.length}` }
    },
  }

  const bindings = {
    DB: await databases.fresh(),
    TURNSTILE_SECRET: 'test-only-turnstile-secret',
    LEADS_FROM: 'leads@example.com',
    LEADS_TO: 'owner@example.com',
    LEAD_LIMITER: testRateLimiter({ limit: 5, period: 60 }),
    // SAFETY: the app only ever calls send on either binding.
    LEAD_EMAILS: queue as unknown as Queue<typeof LeadEmail.Type>,
    OWNER_EMAIL: ownerEmail as unknown as SendEmail,
    ENVIRONMENT: 'test' as const,
  }
  const env = testEnv(Layer.merge(fakeTurnstile, layer), bindings)

  /** Runs the queue consumer over what the form queued, as Cloudflare would. */
  async function deliver(env_ = env) {
    const batch = testBatch(queued.splice(0))
    await worker.queue(batch, env_)
    return batch
  }

  return { env, bindings, queued, inbox, deliver }
}

/** A request as Inertia sends a form: its fields as JSON. */
export function send(method: 'POST' | 'PUT' | 'DELETE', fields: Record<string, unknown> = {}): RequestInit {
  return {
    method,
    headers: { 'X-Inertia': 'true', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify(fields),
  }
}

/** A visit to a page, as Inertia makes it. */
export const visit: RequestInit = { headers: { 'X-Inertia': 'true' } }

/** What a person fills in. */
export const grace = {
  name: 'Grace Hopper',
  email: 'Grace@Example.com',
  company: 'Harvard Computation Lab',
  teamSize: '11-50',
  message: 'We ship every Friday and nobody reads the notes.',
  turnstile: personToken,
}
