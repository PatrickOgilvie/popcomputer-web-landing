import type { Database } from './db'
import type { Bindings } from './env'
import { leads } from './schema'

/**
 * What the local database holds after `bun run db:seed`: two leads, one the
 * owner has been emailed about and one still queued. It runs in Bun on the
 * local D1 database once the migrations are applied, never on the deployed
 * one, and its inserts are typed by src/schema.ts like the app's own.
 */
export async function seed(db: Database, _env: Bindings): Promise<void> {
  const now = Date.now()

  await db.insert(leads).values([
    {
      name: 'Grace Hopper',
      email: 'grace@example.com',
      company: 'Harvard Computation Lab',
      teamSize: '11-50',
      message: 'We ship every Friday and nobody reads the notes. Can Shipnote group them by customer?',
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      emailStatus: 'sent',
      emailedAt: new Date(now - 2 * 60 * 60 * 1000 + 4000),
    },
    {
      name: 'Alan Turing',
      email: 'alan@example.com',
      company: null,
      teamSize: '1-10',
      message: null,
      createdAt: new Date(now - 5 * 60 * 1000),
    },
  ])
  console.log('Added two leads.')
}
