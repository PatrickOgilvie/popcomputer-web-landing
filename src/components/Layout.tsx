import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { buttonClassName } from '~/components/button'
import Logo from '~/components/Logo'
import usePageTransitionFocus from '~/components/usePageTransitionFocus'

const sections = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const

export const repository = 'https://github.com/PatrickOgilvie/popcomputer-web-landing'

/** Says plainly that Shipnote is an example, and where its code is. */
function DemoBanner() {
  return (
    <div className="bg-stone-900 text-stone-200 dark:bg-stone-900">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:px-6 sm:text-sm lg:px-8">
        <span>
          Shipnote isn’t a real product: this is an example landing page built with{' '}
          <a href="https://web.popcomputer.com/examples" className="font-medium text-white underline underline-offset-2">
            @popcomputer/web
          </a>
          .
        </span>
        <a href={repository} className="inline-flex items-center gap-1 font-medium text-white underline underline-offset-2">
          Read its code
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  )
}

/** The landing page's frame: the demo banner, a header with the page's sections, and the footer. */
export default function Layout({ children }: { readonly children: ReactNode }) {
  const { mainRef, announcement } = usePageTransitionFocus()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-stone-900"
      >
        Skip to content
      </a>

      <DemoBanner />

      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#fffbf5]/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex gap-1">
              {sections.map((section) => (
                <li key={section.href}>
                  <a
                    href={section.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-stone-400 dark:hover:text-white"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a href="/#demo" className={buttonClassName({ className: 'ml-auto' })}>
            Book a demo
          </a>
        </div>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <Logo className="text-base text-stone-900 dark:text-stone-100" />
            <span>Release notes, written for you.</span>
          </div>
          <p>
            An example app.{' '}
            <a href="https://web.popcomputer.com/examples" className="underline underline-offset-2 hover:text-stone-900 dark:hover:text-white">
              See the others
            </a>
            .
          </p>
        </div>
      </footer>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
