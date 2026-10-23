interface ImportMetaEnv {
  /** Turnstile's public site key: .env.development holds Cloudflare's test key, .env.production the widget's own. */
  readonly VITE_TURNSTILE_SITE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
