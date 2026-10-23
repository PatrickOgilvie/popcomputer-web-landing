// Each page's props, as the Effect Schema `render` checks and encodes them
// with: a column the schema does not name never reaches the browser.
import { Schema as S, Struct } from 'effect'
import { tableSchema } from '@popcomputer/web/schema'
import * as schema from './schema'

export const SentLead = tableSchema(schema.leads).mapFields((fields) => ({
  ...Struct.pick(fields, ['name', 'company', 'teamSize', 'createdAt', 'emailStatus', 'emailedAt']),
  // The email the owner gets, as Email Service sends it.
  email: S.Struct({ subject: S.String, text: S.String, replyTo: S.String }),
}))

export const pages = {
  Landing: S.Struct({}),
  Thanks: S.Struct({ lead: S.NullOr(SentLead) }),
}
