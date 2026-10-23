// The fields each form sends, which its action validates and its page types
// its form with. The browser imports this module only with `import type`.
import { Schema as S } from 'effect'
import { email, max, nullable, requiredString } from '@popcomputer/web/schema'

export const TeamSize = S.Literals(['1-10', '11-50', '51-200', '200+'])

export const LeadForm = S.Struct({
  name: requiredString.check(S.isMaxLength(100, { message: 'Use at most 100 characters.' })),
  email,
  company: nullable(max(100, 'Use at most 100 characters.')),
  teamSize: TeamSize,
  message: nullable(max(2000, 'Use at most 2,000 characters.')),
  // The token Turnstile's widget hands the page once it's satisfied the
  // visitor is a person. The server checks it with Turnstile, once.
  turnstile: requiredString,
})
