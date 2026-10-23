import { app, routes } from './app'
import { emailOwner, LeadEmail, sweepLeads } from './leads'
import './routes'

export default {
  fetch: app.fetch,
  // Each new lead's message: the owner's email goes from here, and a send
  // that fails goes back to the queue to try again.
  queue: routes.queue(LeadEmail, (message) => emailOwner(message.leadId)),
  // The daily Cron Trigger wrangler.jsonc declares: leads are kept 30 days.
  scheduled: routes.scheduled(() => sweepLeads),
}
