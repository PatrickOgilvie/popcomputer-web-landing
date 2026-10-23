import { useEffect, useRef, useState } from 'react'

interface TurnstileOptions {
  readonly sitekey: string
  readonly action: string
  readonly theme: 'auto' | 'light' | 'dark'
  readonly size: 'normal' | 'flexible' | 'compact'
  readonly callback: (token: string) => void
  readonly 'expired-callback': () => void
  readonly 'error-callback': () => void
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | undefined

/** Loads Turnstile's script once, however many widgets ask. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile !== undefined) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => (window.turnstile === undefined ? reject(new Error('Turnstile did not load')) : resolve(window.turnstile))
    script.onerror = () => {
      loading = undefined
      reject(new Error('Turnstile did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

interface TurnstileProps {
  /** The action the server expects the token to carry. */
  readonly action: string
  /** Receives each token, and an empty one when it expires or fails. */
  readonly onToken: (token: string) => void
  /** Changing it asks for a new token: a token works once, so after a failed submit. */
  readonly resetKey: number
}

/**
 * Cloudflare Turnstile's widget, rendered explicitly so a form that stays on
 * the page can ask it for a fresh token. Most visitors never see a puzzle.
 */
export default function Turnstile({ action, onToken, resetKey }: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)
  const handler = useRef(onToken)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    handler.current = onToken
  }, [onToken])

  useEffect(() => {
    let cancelled = false
    loadTurnstile().then(
      (api) => {
        if (cancelled || container.current === null) return
        widget.current = api.render(container.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          action,
          theme: 'auto',
          size: 'flexible',
          callback: (token) => handler.current(token),
          'expired-callback': () => handler.current(''),
          'error-callback': () => handler.current(''),
        })
      },
      () => {
        if (!cancelled) setFailed(true)
      }
    )
    return () => {
      cancelled = true
      if (widget.current !== undefined) window.turnstile?.remove(widget.current)
      widget.current = undefined
    }
  }, [action])

  useEffect(() => {
    if (resetKey === 0 || widget.current === undefined) return
    handler.current('')
    window.turnstile?.reset(widget.current)
  }, [resetKey])

  return failed ? (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      The check that keeps bots out didn’t load. If a blocker stops challenges.cloudflare.com, allow it and reload the page.
    </p>
  ) : (
    <div ref={container} className="min-h-[65px]" />
  )
}
