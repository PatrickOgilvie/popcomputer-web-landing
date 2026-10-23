import { Code } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '~/components/cn'

interface UnderTheHoodProps {
  /** Method and path, for example `GET /projects`. */
  readonly route: string
  /** The action in `src/actions` that answers it, for example `createProject`. */
  readonly action: string
  /** Lists guarantees in one column for narrow placements. */
  readonly compact?: boolean
  readonly children: ReactNode
}

/** States which framework guarantees the current page demonstrates. */
export default function UnderTheHood({
  route,
  action,
  compact = false,
  children,
}: UnderTheHoodProps) {
  return (
    <aside
      aria-label="Under the hood"
      className="rounded-lg border border-stone-200 bg-stone-100/70 p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Code className="size-4 text-stone-500" aria-hidden="true" />
          Under the hood
        </p>
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-stone-600 dark:text-stone-400">
          <span>{route}</span>
          <span aria-hidden="true">·</span>
          <span>{action}</span>
        </p>
      </div>
      <ul
        className={cn(
          'mt-3 grid gap-2 text-sm text-pretty text-stone-600 dark:text-stone-400',
          !compact && 'sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {children}
      </ul>
    </aside>
  )
}

/** One guarantee listed inside {@link UnderTheHood}. */
export function Guarantee({ children }: { readonly children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span
        className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-400 dark:bg-stone-600"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  )
}
