import type { EmailMessageBuilder, Queue, RateLimit, SendEmail } from '@cloudflare/workers-types'
import { and, count, eq, gte, lt } from 'drizzle-orm'
import { Context, DateTime, Effect, Layer, Option, Redacted, Schema as S } from 'effect'
import { config, dbMutation, dbQuery } from '@popcomputer/web/effect'
import { leads } from './schema'

/** What the queue carries for each new lead: only its id, so the message holds nothing personal. */
export const LeadEmail = S.Struct({ leadId: S.String })

/** How many emails the owner gets in a day; leads past it wait in the database. */
export const DAILY_EMAIL_LIMIT = 50

/** How long a lead is kept. */
export const LEAD_DAYS = 30

/** The action the form's Turnstile widget names, which a token must carry back. */
export const TURNSTILE_ACTION = 'lead'

type Lead = typeof leads.$inferSelect

// ---------------------------------------------------------------------------
// The other systems a lead passes through, each a service a test replaces.

/** Asks Turnstile whether the widget's token came from a person, on this site. */
export class Turnstile extends Context.Service<
  Turnstile,
  {
    readonly verify: (check: { readonly token: string; readonly ip: string | undefined; readonly hostname: string }) => Effect.Effect<boolean>
  }
>()('app/Turnstile') {}

/** Counts each address's messages, so one address can't fill the owner's inbox. */
export class LeadLimiter extends Context.Service<LeadLimiter, { readonly allows: (key: string) => Effect.Effect<boolean> }>()(
  'app/LeadLimiter'
) {}

/** Hands a new lead to the queue, whose consumer emails the owner. */
export class LeadQueue extends Context.Service<LeadQueue, { readonly enqueue: (leadId: string) => Effect.Effect<void> }>()(
  'app/LeadQueue'
) {}

export class EmailNotSent extends S.TaggedError<EmailNotSent>()('EmailNotSent', { code: S.String, message: S.String }) {}

/** Sends the owner an email, at the one address LEADS_TO holds. */
export class OwnerInbox extends Context.Service<
  OwnerInbox,
  { readonly send: (email: OwnerEmail) => Effect.Effect<void, EmailNotSent> }
>()('app/OwnerInbox') {}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const Siteverify = S.Struct({
  success: S.Boolean,
  hostname: S.optional(S.String),
  action: S.optional(S.String),
  metadata: S.optional(S.Struct({ result_with_testing_key: S.optional(S.Boolean) })),
})

/**
 * Whether Turnstile's answer lets the lead in: a token solved for this form,
 * on the host it was posted to. Cloudflare's test secret passes any token from
 * any host, so its answers count everywhere but in production.
 */
export function acceptsVerdict(
  verdict: typeof Siteverify.Type,
  expected: { readonly hostname: string; readonly environment: string }
): boolean {
  if (!verdict.success) return false
  if (verdict.metadata?.result_with_testing_key === true) return expected.environment !== 'production'
  return verdict.hostname === expected.hostname && verdict.action === TURNSTILE_ACTION
}

const turnstileLive = Layer.effect(
  Turnstile,
  Effect.gen(function* () {
    const secret = yield* config.redacted('TURNSTILE_SECRET')
    const environment = yield* config.string('ENVIRONMENT')

    return Turnstile.of({
      verify: ({ token, ip, hostname }) =>
        Effect.tryPromise(async () => {
          const body = new URLSearchParams({ secret: Redacted.value(secret), response: token })
          if (ip !== undefined) body.set('remoteip', ip)
          const res = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(10_000) })
          if (!res.ok) throw new Error(`Turnstile answered ${res.status}`)
          return (await res.json()) as unknown
        }).pipe(
          Effect.map((json) =>
            Option.match(S.decodeUnknownOption(Siteverify)(json), {
              onNone: () => false,
              onSome: (verdict) => acceptsVerdict(verdict, { hostname, environment }),
            })
          ),
          // Turnstile out of reach lets nobody in: the visitor can try again.
          Effect.tapError((error) => Effect.logWarning('Turnstile could not check a token', error)),
          Effect.orElseSucceed(() => false)
        ),
    })
  })
)

// Every email goes to LEADS_TO, the owner's address, and from LEADS_FROM, the
// one sender wrangler.jsonc allows the binding.
const ownerInboxFor = (binding: SendEmail) =>
  Layer.effect(
    OwnerInbox,
    Effect.gen(function* () {
      const from = yield* config.string('LEADS_FROM')
      const to = Redacted.value(yield* config.redacted('LEADS_TO'))

      return OwnerInbox.of({
        send: (email) => {
          const message: EmailMessageBuilder = { from: { email: from, name: 'Shipnote leads' }, to, ...email }
          return Effect.tryPromise({
            try: () => binding.send(message),
            catch: (error) =>
              new EmailNotSent({
                code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'E_UNKNOWN',
                message: error instanceof Error ? error.message : String(error),
              }),
          }).pipe(Effect.asVoid)
        },
      })
    })
  )

/** Each request's services, from its bindings. */
export const leadServicesFor = (bindings: {
  readonly LEAD_LIMITER: RateLimit
  readonly LEAD_EMAILS: Queue<typeof LeadEmail.Type>
  readonly OWNER_EMAIL: SendEmail
}) =>
  Layer.mergeAll(
    turnstileLive,
    ownerInboxFor(bindings.OWNER_EMAIL),
    Layer.succeed(
      LeadLimiter,
      LeadLimiter.of({
        allows: (key) => Effect.promise(() => bindings.LEAD_LIMITER.limit({ key })).pipe(Effect.map((outcome) => outcome.success)),
      })
    ),
    Layer.succeed(
      LeadQueue,
      LeadQueue.of({ enqueue: (leadId) => Effect.promise(() => bindings.LEAD_EMAILS.send({ leadId })).pipe(Effect.asVoid) })
    )
  )

// ---------------------------------------------------------------------------
// The owner's email.

export interface OwnerEmail {
  readonly subject: string
  readonly text: string
  readonly html: string
  readonly replyTo: { readonly email: string; readonly name: string }
}

const teamSizes: Record<Lead['teamSize'], string> = {
  '1-10': '1–10 people',
  '11-50': '11–50 people',
  '51-200': '51–200 people',
  '200+': 'More than 200 people',
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

// A header holds one line: a name sent with a line break can't add another.
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim()

/** The email the owner gets for a lead: plain text, the same in HTML, and a reply that reaches the lead. */
export function ownerEmail(lead: Pick<Lead, 'name' | 'email' | 'company' | 'teamSize' | 'message'>): OwnerEmail {
  const name = oneLine(lead.name)
  const company = lead.company === null ? null : oneLine(lead.company)
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Name', name],
    ['Email', lead.email],
    ['Company', company ?? '—'],
    ['Team', teamSizes[lead.teamSize]],
  ]
  const message = lead.message ?? 'They left no message.'

  return {
    subject: `New demo request: ${name}${company === null ? '' : ` at ${company}`}`,
    text: [
      'Someone asked for a demo on the Shipnote landing page.',
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      message,
      '',
      'Reply to this email to answer them.',
    ].join('\n'),
    html: [
      '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b">',
      '<p>Someone asked for a demo on the Shipnote landing page.</p>',
      '<table style="border-collapse:collapse">',
      ...rows.map(
        ([label, value]) =>
          `<tr><td style="padding:2px 16px 2px 0;color:#71717a">${label}</td><td style="padding:2px 0">${escapeHtml(value)}</td></tr>`
      ),
      '</table>',
      `<p style="white-space:pre-wrap;border-left:3px solid #e4e4e7;padding-left:12px">${escapeHtml(message)}</p>`,
      '<p style="color:#71717a">Reply to this email to answer them.</p>',
      '</div>',
    ].join(''),
    replyTo: { email: lead.email, name },
  }
}

// ---------------------------------------------------------------------------
// The queue consumer and the daily sweep.

/**
 * Emails the owner about one lead. The queue delivers each message at least
 * once, so a lead that's gone or already handled is left as it is; a send
 * that fails fails the message, and the queue retries it.
 */
export const emailOwner = (leadId: string) =>
  Effect.gen(function* () {
    const [lead] = yield* dbQuery((db) => db.select().from(leads).where(eq(leads.id, leadId)))
    if (lead === undefined || lead.emailStatus !== 'queued') return

    const now = yield* DateTime.now
    const dayAgo = DateTime.toDateUtc(DateTime.subtract(now, { days: 1 }))
    const [sentToday] = yield* dbQuery((db) => db.select({ emails: count() }).from(leads).where(gte(leads.emailedAt, dayAgo)))

    if ((sentToday?.emails ?? 0) >= DAILY_EMAIL_LIMIT) {
      yield* dbMutation((db) => db.update(leads).set({ emailStatus: 'held' }).where(eq(leads.id, lead.id)))
      return
    }

    const inbox = yield* OwnerInbox
    yield* inbox.send(ownerEmail(lead))
    yield* dbMutation((db) =>
      db
        .update(leads)
        .set({ emailStatus: 'sent', emailedAt: DateTime.toDateUtc(now) })
        .where(and(eq(leads.id, lead.id), eq(leads.emailStatus, 'queued')))
    )
  })

/** Deletes the leads older than {@link LEAD_DAYS}. */
export const sweepLeads = Effect.gen(function* () {
  const cutoff = DateTime.toDateUtc(DateTime.subtract(yield* DateTime.now, { days: LEAD_DAYS }))

  yield* dbMutation((db) => db.delete(leads).where(lt(leads.createdAt, cutoff)))
})
