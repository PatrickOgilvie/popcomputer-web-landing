import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { TeamSize } from './forms'

export const EmailStatus = ['queued', 'sent', 'held'] as const

/** Each message the landing page's form sent, kept 30 days. */
export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company'),
    teamSize: text('team_size', { enum: TeamSize.literals }).notNull(),
    message: text('message'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    // queued until the owner's email goes, sent once it has, and held when
    // the day's emails have run out: the lead is still here to read.
    emailStatus: text('email_status', { enum: EmailStatus }).notNull().default('queued'),
    emailedAt: integer('emailed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('leads_created_idx').on(table.createdAt),
    index('leads_emailed_idx').on(table.emailedAt),
    // The database holds the same limits the form checks, whatever writes to it.
    check('leads_name_length', sql`length(${table.name}) BETWEEN 1 AND 100`),
    check('leads_email_length', sql`length(${table.email}) BETWEEN 3 AND 254`),
    check('leads_company_length', sql`${table.company} IS NULL OR length(${table.company}) <= 100`),
    check('leads_message_length', sql`${table.message} IS NULL OR length(${table.message}) <= 2000`),
    check('leads_team_size', sql`${table.teamSize} IN ('1-10', '11-50', '51-200', '200+')`),
    check('leads_email_status', sql`${table.emailStatus} IN ('queued', 'sent', 'held')`),
  ]
)
