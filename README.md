<img src="src/assets/popcomputer.png" alt="Popcomputer" width="374" height="69">

# A landing page on @popcomputer/web

An example application made from the
[template](https://github.com/PatrickOgilvie/popcomputer-web-demo): a
one-page site for Shipnote, a made-up product, whose form books a demo. The
form is guarded by Cloudflare Turnstile, each message is kept in D1, and a
Cloudflare Queue hands it to Cloudflare Email Service, which emails the
site's owner.

**Live at [landing.web.popcomputer.com](https://landing.web.popcomputer.com).** Send the form: the next page shows the message being saved, queued and emailed, and the email the owner gets.

React pages served by Inertia from a Cloudflare Worker, with Effect actions
and D1, built on
[@popcomputer/web](https://github.com/PatrickOgilvie/popcomputer-web). Its
[README](https://github.com/PatrickOgilvie/popcomputer-web#readme) explains
each part; this repository shows them taking a form from a stranger safely.

```ts
// src/actions/leads.ts: the form's post
export const sendLead = action(
  Effect.gen(function* () {
    const input = yield* validateRequest(LeadForm)
    // ...five messages a minute from one address, at most...

    const turnstile = yield* Turnstile
    const person = yield* turnstile.verify({ token: input.turnstile, ip, hostname: new URL(request.url).hostname })
    if (!person) return yield* invalid({ turnstile: 'We couldn’t confirm you’re a person. Try the check again.' })

    // Kept first, then queued: a slow or failing email never loses a lead.
    yield* dbMutation((db) => db.insert(leads).values({ id, ...lead, createdAt }))
    yield* queue.enqueue(id)

    return yield* redirect(paths.thanks)
  })
)
```

## Contents

- [What it does](#what-it-does) · [How it's built](#how-its-built) · [Setting up Turnstile and email](#setting-up-turnstile-and-email) · [Running it locally](#running-it-locally) · [Checks](#checks)
- [Changing the database](#changing-the-database) · [The local database's data](#the-local-databases-data) · [Vars and secrets](#vars-and-secrets) · [Deploying](#deploying) · [Deploying from GitHub](#deploying-from-github)
- [Upgrading](#upgrading) · [Working with coding agents](#working-with-coding-agents)

## What it does

- **A landing page.** Shipnote's hero, features, steps, pricing and
  questions, on one page, in light and dark. It reads nothing per visitor, so
  Cloudflare's edge serves it from its page cache.
- **A form that books a demo.** Name, work email, company, team size and a
  message, checked on the server, and in the database by `CHECK`
  constraints. A failed form goes back with its errors beside the fields.
- **Turnstile in front of it.** The widget proves a visitor is a person,
  usually without a puzzle; the server checks its token with Turnstile's
  `siteverify`, for this form's action and this site's host, once.
- **A limit per address.** A Rate Limiting binding lets one address send
  five messages a minute.
- **Kept, then emailed.** Each message is written to D1 first, then queued.
  The Worker's queue consumer emails the owner through Email Service, with a
  reply-to that reaches the sender, and marks the lead sent. A send that
  fails goes back to the queue to try again; a repeat delivery sends nothing.
- **One address only.** The `send_email` binding has one
  `destination_address`, so the Worker can't email anyone but the owner, and
  it sends 50 a day at most: the rest wait in the database.
- **A thank-you page that watches.** It shows the message this browser sent,
  through a cookie scoped to `/thanks`, and the email the owner gets, and asks
  for the lead alone every two seconds until the email has gone.
- **Thirty days, then gone.** The daily Cron Trigger deletes older leads.

Each page ends with an "Under the hood" panel naming the action that answers
it and what the framework guarantees there.

## How it's built

- **Every name is declared once, and the rest derives from it.**

  | File | Declares |
  | --- | --- |
  | `src/paths.ts` | Every URL: `/`, `/leads` and `/thanks`. |
  | `src/schema.ts` | The `leads` table, with its limits as `CHECK` constraints. |
  | `src/forms.ts` | The form's schema, which types the form in React too. |
  | `src/pages.ts` | Each page's props. A column a page doesn't name never reaches the browser. |
  | `src/env.ts` | The Worker's vars, its Turnstile secret and its bindings. |
  | `src/app.ts` | `setupWeb`, and each request's services from its bindings. |
  | `src/routes.ts` | Every route and the action that answers it. |
  | `src/worker.ts` | The Worker: its fetch, queue and scheduled handlers. |

- **Each other system is a service** in `src/leads.ts`: `Turnstile`,
  `LeadLimiter`, `LeadQueue` and `OwnerInbox`, built from each request's
  bindings with `web.services({ request })`. The tests swap Turnstile for a
  fake, and hand the app a queue and an inbox that keep what they're sent.

- **The queue carries only the lead's id.** Its consumer reads the lead from
  D1, so the message holds nothing personal, and a lead deleted meanwhile is
  simply skipped:

  ```ts
  // src/worker.ts
  export default {
    fetch: app.fetch,
    queue: routes.queue(LeadEmail, (message) => emailOwner(message.leadId)),
    scheduled: routes.scheduled(() => sweepLeads),
  }
  ```

- **What the lead wrote is escaped** in the email's HTML, and the subject
  is kept to one line.

The rest of the tree:

```text
src/
  actions/      the actions
  pages/        the React pages, each listed in src/main.tsx
  components/   shared React components, Turnstile's widget among them
  leads.ts      the services, the owner's email, the queue consumer and the sweep
migrations/     D1 migrations, generated by drizzle-kit
test/           tests through the app, each on a D1 database of its own
```

## Setting up Turnstile and email

Locally, nothing: `.env.development` and `.dev.vars.example` hold
Cloudflare's Turnstile test keys, whose widget always passes, and `bun run
dev` keeps each email in a file under `.wrangler/tmp/email/` and prints
where. Copy `.dev.vars.example` to `.dev.vars` before the first
`bun run dev`.

On Cloudflare, once:

1. **Turnstile.** Create a widget for your domain, in the dashboard's
   Turnstile page or with
   `bunx wrangler turnstile widget create my-landing --domain example.com --mode managed`.
   Put its site key in `.env.production` (`VITE_TURNSTILE_SITE_KEY`), which is
   built into the page, and its secret on the Worker with
   `bun run secret TURNSTILE_SECRET`. The app refuses the test secret's
   answers in production.
2. **Email.** Onboard the domain you send from in the dashboard's
   Email Service, under Email Sending. It adds the SPF, DKIM and DMARC
   records. Set `LEADS_FROM` in `wrangler.jsonc` to an address on it, and
   `LEADS_TO` and the `send_email` binding's `destination_address` to the
   address that gets the emails; a test checks those two match.
3. **The queue.** Create it once: `bunx wrangler queues create popcomputer-web-landing-emails`,
   or the name you give it in `wrangler.jsonc`.
4. **The address.** `routes` in `wrangler.jsonc` names this example's own
   domain; remove it, or name one of yours.

## Running it locally

### Once per computer

You need [Node.js](https://nodejs.org) 22 or later, and better 24,
[Bun](https://bun.sh) and [portless](https://github.com/vercel-labs/portless)
running in the background. Wrangler, Vite and everything else come with each
app. Wrangler needs Node.js 22, and `bun run dev` stops with directions on
anything older; portless is built for 24, and its `portless doctor` check fails
below 24, though it runs on 22.

1. Install Node.js with the LTS installer from <https://nodejs.org>. It asks
   for your password. If you use [nvm](https://github.com/nvm-sh/nvm), its
   Node.js comes first instead: run `nvm install 24`, `nvm alias default 24`
   and `nvm use 24`.
2. Install Bun, then open a new terminal:

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. Install portless, and have it start with your computer:

   ```bash
   bun add -g portless@0.15.8
   portless service install
   ```

   `portless service install` asks for your password once. It trusts a local
   certificate for `https://*.localhost` and serves those addresses on port
   443, after every restart too. A coding agent can't enter a password, so run
   this in your own terminal.

### Each app

```bash
bun create PatrickOgilvie/popcomputer-web-demo my-app
cd my-app
bun run dev
```

`bun create` suggests `bun dev` when it finishes, which runs the same script.
Open <https://my-app.localhost>. The app's address is its name, which
`bun create` takes from the folder you chose. Its Worker and database on
Cloudflare take the same name when you first set it up there.

`bun run dev` does the setup a new app needs. The first time, it writes
`.dev.vars` with a new secret for signing in, and each time it applies any new
migrations to the local D1 database. It stops, saying what to add, if
`.dev.vars` lacks a secret `src/env.ts` says the app needs, as
[Vars and secrets](#vars-and-secrets) shows. Then it runs Vite, with Cloudflare's
Vite plugin running the Worker inside it, so the pages and their scripts share
one address, and an edit shows in the browser as you save it. Portless gives
that address the app's name instead of a port. If Node.js is missing, it says
so and stops. Once Vite is ready it says which address to open. Stop the app
with Ctrl-C, or, when it runs in another terminal or in the background, with
`bun run stop` in its folder. If it stops by itself, it says so. Apps made
from the template can run at once, each at its own address.

When a coding agent runs `bun run dev`, its output also names the Local
Explorer, at `/cdn-cgi/local/explorer` on the app's address: Cloudflare's page
for looking at the local database, KV and traces, with an API for agents at
`/cdn-cgi/local/explorer/api`. The app itself is at its address's other paths.

Until you first deploy the app, `wrangler.jsonc` holds the template's names,
so a build's `dist/popcomputer_web_demo` folder shows them;
`bun run deploy` gives the Worker and its database the app's name.
`bun run dev` already uses the app's name. The local database keeps its data
through that first deploy, which writes the new database's id into
`wrangler.jsonc`: `preview_database_id` names the local one `local`, whatever
the id.

If the address shows portless's "404 - Not Found" page, the app isn't running:
start it with `bun run dev`, whatever command that page suggests.

To try the form from a terminal, post its fields with curl, which the app
answers as a command-line client: a form that fails validation gets a 422
with the errors as JSON, and one that passes a 303 to `/thanks`. Locally the
test secret accepts any token, so any `turnstile` value passes. Send the
`Origin` a browser would. Put your app's name in place of `my-app`:

```bash
curl -isS https://my-app.localhost/leads \
  -H 'Origin: https://my-app.localhost' \
  --data-urlencode 'name=Sam' --data-urlencode 'email=sam@example.com' \
  --data-urlencode 'teamSize=1-10' --data-urlencode 'turnstile=any'
```

Without the portless service, `bun run dev` asks for your password the first
time it runs, and again after a restart. `PORTLESS=0 bun run dev` skips
portless and serves the app at <http://localhost:5173>.

A build (`bun run build`) writes the client to `dist/client`, with the manifest
the Worker reads its bundle's file names from, and the Worker to `dist/`
beside it, with a copy of `wrangler.jsonc` that `wrangler deploy` uses. The
package scripts pass `-c wrangler.jsonc` to Wrangler's other commands, so they
read your own config rather than that copy.

In a copy you cloned or made with GitHub's "Use this template", run
`bun install` first; the app's address then comes from `name` in
`package.json`.

## Checks

```bash
bun run check
```

`check` runs the type check, the framework's lint rules (`oxlint`) and the
tests. The tests send requests through the app, as a browser would, each
against a D1 database of its own in Miniflare, in process, and run the queue
consumer and the daily sweep as Cloudflare would. On GitHub, `.github/workflows/check.yml` runs it for each push to
`main` and each pull request.

## Changing the database

Edit `src/schema.ts`, then generate a migration and apply it locally:

```bash
bun run db:generate
```

```bash
bun run db:migrate:local
```

`bun run dev` also applies new migrations when it starts, so restarting it
does the same. `bun run deploy` won't deploy a change to `src/schema.ts`
until there's a migration for it.

Don't edit a migration that has been applied anywhere; add another.

## The local database's data

To start the local database again with something in it:

```bash
bun run db:seed
```

It deletes everything in the local database, applies the migrations to a
new one, then runs `src/seed.ts`, which adds two leads, one emailed and one
still queued. A seed exports a function that takes the database and the
Worker's bindings, and inserts with Drizzle, so `bun run check` reports a
seed a schema change has broken.

`bun run db:seed --file seeds/demo.sql` runs a SQL file instead, or another
module that exports a seed. To empty the local database without seeding it:

```bash
bun run db:reset
```

Both ask before deleting anything. Without a terminal to ask in, as when a
coding agent runs them, they stop and say to add `--yes`. Neither runs while
`bun run dev` has the database open: stop it with `bun run stop` first. Only
the local database is ever reset; the one on Cloudflare keeps its data.

To run one SQL statement on the local database, and see what it returns:

```bash
bun run db:execute "SELECT name, email, email_status FROM leads"
```

With `--remote`, it runs on the database on Cloudflare, the live app's.
A statement that only reads, such as a `SELECT`, runs straight away; one that
could change data asks first, since `bun run rollback` won't undo it, and
without a terminal it wants `--yes`. Put the statement in quotes, so the
shell passes it whole. Wrangler's output calls the database on Cloudflare the
"preview database" there, as it does when a deploy applies migrations,
because `preview_database_id` is set; it's the live database all the same,
with the id in brackets.

## Vars and secrets

`src/env.ts` declares each var and secret the Worker reads, once, with an
Effect schema for its value. The Worker checks its own against it before it
serves: a missing or invalid one fails every request, and its log names which.
The commands below check them before that can happen. This app has one
secret, `TURNSTILE_SECRET`, and three vars: `ENVIRONMENT`, `LEADS_FROM` and
`LEADS_TO`.

A secret, such as another service's API key, is declared with `secret(...)`.
A secret nobody has to choose, such as a signing key, has a `generate`,
and `bun run dev` and `bun run deploy` each make one where it's missing:

```ts
export const env = defineEnv({
  BETTER_AUTH_SECRET: secret(S.String.check(S.isMinLength(32)), { generate: randomSecret }),
  RESEND_API_KEY: secret(S.String.check(S.isStartingWith('re_'))),
  ENVIRONMENT: variable(S.Literals(['development', 'production', 'test'])),
})
```

Then give it a value in each place the app runs:

- **On this computer**, in `.dev.vars` (git ignores it): add a line
  `RESEND_API_KEY=re_...`. `bun run dev` won't start without it.
- **On Cloudflare**, with `bun run secret RESEND_API_KEY`. It asks for the
  value without showing it, checks it against `src/env.ts`, and uploads it.
  An agent pipes the value in instead:
  `printf %s "$RESEND_API_KEY" | bun run secret RESEND_API_KEY`.
- **In the tests**, in `test/app.ts`'s bindings.
- **For the Deploy to Cloudflare button**, as a line in `.dev.vars.example`,
  so it asks for the value; a test checks every secret is there.

A plain var, such as `ENVIRONMENT`, is declared with `variable(...)` and set
in `vars` in `wrangler.jsonc`, which is committed, so never a secret there.
`{ optional: true }` declares one the app runs without.

To check them at any time:

```bash
bun run env:check
```

checks `.dev.vars` and `wrangler.jsonc`'s vars, as `bun run dev` would.

```bash
bun run env:check --remote
```

checks every secret is set on Cloudflare, and `wrangler.jsonc`'s vars, as
`bun run deploy` would. Cloudflare never shows a secret's value, so it checks
each one is set, not what it holds. Neither shows a value.

## Deploying

First set up Turnstile, email and the queue, as
[Setting up Turnstile and email](#setting-up-turnstile-and-email) says.

**From your computer**, the first time, sign in to Cloudflare. This opens your
browser to allow Wrangler into your account; a free account is enough:

```bash
bun run cloudflare:login
```

Then deploy, now and after every change:

```bash
bun run deploy
```

It's safe to run again at any time. Each run:

1. Names the Worker and its database after the app, in `wrangler.jsonc`.
2. Stops if `src/schema.ts` has a change with no migration, and says to run
   `bun run db:generate`.
3. Stops if Wrangler isn't signed in, and says to run
   `bun run cloudflare:login`.
4. Stops, before changing anything on Cloudflare, if the Worker lacks a
   secret `src/env.ts` says it needs and nothing can make, naming the
   `bun run secret NAME` that sets it, or if `wrangler.jsonc` lacks a var.
   Then uploads a new value for each secret `src/env.ts` can make, the first
   time; this app has none. It never replaces one.
5. Creates the app's D1 database the first time, and writes its id into
   `wrangler.jsonc`; commit that change. If the id is lost, the next run finds
   the database by its name instead of making another.
6. Builds the app and applies new migrations to the D1 database.
7. Uploads the build as a new version of the Worker, beside the live one,
   and checks it answers at its own address, its Version URL: the landing
   page has 30 seconds to answer. Only then does the
   new version go live, with the cron schedule and `workers.dev` settings in
   `wrangler.jsonc`, and the deploy prints the app's address.

When the new version doesn't answer, the live one stays as it was. The
deploy says what the new version answered, and at which address, then
stops; open that address to see the problem, fix it, and deploy again.
Migrations the run applied stay applied, as after a rollback, so the live
code has to work with the newer tables.

The first deploy has no live version to keep, so it goes live straight away,
as `wrangler deploy` does, and is checked at its `workers.dev` address once
it's live. So is a version Cloudflare gives no Version URL. `"preview_urls":
true` in `wrangler.jsonc` keeps them on, and the first deploy turns them on.
Version URLs are public, as the `workers.dev` address is; if
[Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
asks visitors to sign in there, the check can't see the app, so the deploy
goes live without it and says so.

To share a change for feedback before it goes live:

```bash
bun run preview
```

It builds the app, uploads it as a version that takes none of the live
app's requests, checks it answers, and prints its address, such as
`https://1a2b3c4d-my-app.my-subdomain.workers.dev`. `bun run deploy` makes
the same code live. A preview runs on the live app's database and secrets:
what someone does there they do to the live app's data, and its form emails the owner. It never applies migrations, so it says when the database
on Cloudflare hasn't had one yet: pages that need it fail on the preview
until a deploy applies it. The app has to be deployed once first, and it
stops, as a deploy does, while the Worker lacks a secret `src/env.ts` says it
needs.

To see what's live, and whether each database has every migration:

```bash
bun run status
```

It says which version is live, when it was deployed and by whom, and names
any migration the database on Cloudflare or the local one hasn't had yet.
Without a Cloudflare login, it says how the local database is, then how to
sign in.

To watch the live app's requests, errors and `console.log` lines as they
happen, until you stop it with Ctrl-C:

```bash
bun run logs
```

To go back to the deploy before the current one:

```bash
bun run rollback
```

In a terminal, it asks you to confirm first. A rollback puts back the Worker's
code, not the database: migrations stay applied, so the older code has to work
with the newer tables. Requests to a Version URL, from `bun run preview` or a
deploy's check, don't show in `bun run logs`.

Turnstile checks each token against the host the form was posted to, so
add each address the form is used at, a Version URL's among them, to the
widget's domains.

## Deploying from GitHub

`.github/workflows/deploy.yml` runs `bun run check`, then `bun run deploy`,
for each push to `main`, once the repository has two secrets for it. Until
then it skips the deploy and the run still passes, with a note saying the
secrets are missing. A deploy from GitHub works as one from your computer:
a new version goes live only once it answers, and a run that stops says why
in its log. It deploys to the Worker and database named after the app, as a
deploy from your computer does, and creates them if nothing has been deployed.

1. Create a Cloudflare API token. On the dashboard's
   [Account API tokens](https://dash.cloudflare.com/?to=/:account/api-tokens)
   page, select **Create Token**, and start from the **Edit Cloudflare
   Workers** template. Add the permission **Account**, **D1**, **Edit**,
   which the template lacks and the migrations need, and limit the token to
   the account the app deploys to. Create it, and copy the token.
2. Copy your account ID, the 32 characters after `dash.cloudflare.com/` in
   the dashboard's address once you're signed in. Cloudflare's
   [Find account and zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
   shows where else it appears.
3. In the repository on GitHub, open **Settings**, then **Secrets and
   variables**, then **Actions**, and add two repository secrets:
   `CLOUDFLARE_API_TOKEN`, holding the token, and `CLOUDFLARE_ACCOUNT_ID`,
   holding the account ID.

The next push to `main` deploys it. To deploy without pushing, run the
Deploy workflow from the repository's **Actions** tab.

These two are GitHub's secrets, for reaching Cloudflare; the app's own, which
`src/env.ts` declares, stay on Cloudflare. Set one nothing generates once,
with `bun run secret NAME` from your computer: a deploy from GitHub stops,
naming it, while it's missing.

## Upgrading

An app made from this template keeps the version of @popcomputer/web it
started with. To move it to a newer release, follow the framework's
[upgrade guide](https://github.com/PatrickOgilvie/popcomputer-web/blob/main/UPGRADING.md),
whose installed copy is `node_modules/@popcomputer/web/UPGRADING.md`; its
[changelog](https://github.com/PatrickOgilvie/popcomputer-web/blob/main/CHANGELOG.md)
lists what each release changes.

## Working with coding agents

`AGENTS.md` tells an agent where each thing is declared and how to add a page.
`CLAUDE.md` loads it along with the framework's own rules, from
`node_modules/@popcomputer/web/AGENTS.md`, which name the one API to use for
each task. The framework's
[Which API for which task](https://github.com/PatrickOgilvie/popcomputer-web#which-api-for-which-task)
table lists the same for people.

## License

[MIT](LICENSE)
