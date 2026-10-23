import { action, render } from '@popcomputer/web/effect'
import { sendLead, showThanks } from './actions/leads'
import { routes } from './app'
import { paths } from './paths'

// The landing page reads nothing per visitor, so Cloudflare's edge serves it
// from its cache; only the form's post runs the Worker's logic.
routes.get(paths.home, action(render('Landing')))
routes.post(paths.leads, sendLead, { form: paths.home })
routes.get(paths.thanks, showThanks)
