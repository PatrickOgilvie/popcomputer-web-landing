import { eq } from 'drizzle-orm'
import { DateTime, Effect, Option, Schema as S } from 'effect'
import {
  action,
  cookie,
  dbMutation,
  dbQuery,
  invalid,
  redirect,
  render,
  RequestService,
  validateRequest,
} from '@popcomputer/web/effect'
import { LeadForm } from '../forms'
import { LeadLimiter, LeadQueue, ownerEmail, Turnstile } from '../leads'
import { paths } from '../paths'
import { leads } from '../schema'

/** Which lead this browser sent, so its thank-you page can show it, and only it. */
export const sentLead = cookie('lead', S.String, { maxAge: '1 day', path: paths.thanks })

/**
 * Takes a message from the landing page's form: checked by Turnstile, kept
 * in D1, then queued for the owner's email, so a slow or failing email never
 * loses it.
 */
export const sendLead = action(
  Effect.gen(function* () {
    const input = yield* validateRequest(LeadForm)
    const request = yield* RequestService
    const ip = request.header('CF-Connecting-IP')

    const limiter = yield* LeadLimiter
    if (!(yield* limiter.allows(ip ?? 'unknown'))) {
      return yield* invalid({ form: 'That’s a few messages from you in a minute. Try again shortly.' })
    }

    const turnstile = yield* Turnstile
    const person = yield* turnstile.verify({ token: input.turnstile, ip, hostname: new URL(request.url).hostname })
    if (!person) {
      return yield* invalid({ turnstile: 'We couldn’t confirm you’re a person. Try the check again.' })
    }

    const id = crypto.randomUUID()
    const { turnstile: _token, ...lead } = input
    const createdAt = DateTime.toDateUtc(yield* DateTime.now)

    // The cookie first, as a signed or unsigned cookie should be: a failure
    // after the write still tells this browser which lead it sent.
    yield* sentLead.set(id)
    yield* dbMutation((db) => db.insert(leads).values({ id, ...lead, email: lead.email.toLowerCase(), createdAt }))
    const queue = yield* LeadQueue
    yield* queue.enqueue(id)

    return yield* redirect(paths.thanks)
  })
)

/** The thank-you page: the lead this browser sent, the email its owner gets, and whether it's gone. */
export const showThanks = action(
  Effect.gen(function* () {
    const id = yield* sentLead.read
    const lead = Option.isNone(id)
      ? undefined
      : (yield* dbQuery((db) => db.select().from(leads).where(eq(leads.id, id.value))))[0]

    if (lead === undefined) return yield* render('Thanks', { lead: null })

    const email = ownerEmail(lead)

    return yield* render('Thanks', {
      lead: {
        ...lead,
        email: { subject: email.subject, text: email.text, replyTo: lead.email },
      },
    })
  })
)
