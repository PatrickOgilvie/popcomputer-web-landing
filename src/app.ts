import { Hono } from 'hono'
import { createTemplate, createVersion, setupWeb, vite } from '@popcomputer/web'
import manifest from '../dist/client/manifest.json'
import { createDb } from './db'
import { env, type Env } from './env'
import { leadServicesFor } from './leads'
import { pages } from './pages'
import { paths } from './paths'
import * as schema from './schema'
import { appTitle } from './title'

const entry = manifest['src/main.tsx']
const title = appTitle

// Browser chrome follows the page in both color schemes.
const head = [
  '<meta name="color-scheme" content="light dark">',
  '<meta name="description" content="Shipnote turns your merged pull requests into release notes your customers read.">',
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fffbf5">',
  '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0c0a09">',
].join('\n    ')

export const web = setupWeb(new Hono<Env>(), {
  version: createVersion(manifest),
  // In development the Worker runs inside Vite's dev server, so the pages load
  // from the page's own address, with hot reload; otherwise from the bundle
  // `bun run build` wrote.
  render: createTemplate((c) =>
    c.env.ENVIRONMENT === 'development'
      ? {
          title,
          scripts: [vite.script('/src/main.tsx', new URL(c.req.url).origin)],
          head: `${head}\n    ${vite.hmrHead(new URL(c.req.url).origin)}`,
        }
      : { title, scripts: [`/${entry.file}`], styles: (entry.css ?? []).map((file) => `/${file}`), head }
  ),
  database: (c) => createDb(c.env.DB),
  schema,
  pages,
  paths,
  errors: { component: 'Errors/Error' },
  // Checks the Worker's vars and secrets against src/env.ts before it serves.
  env,
})

declare module '@popcomputer/web' {
  interface Register {
    web: typeof web
  }
}

// Turnstile, the rate limiter, the queue and the owner's inbox, from each
// request's bindings: a test replaces any of them.
export const { app, routes } = web.services({ request: (c) => leadServicesFor(c.env) })
