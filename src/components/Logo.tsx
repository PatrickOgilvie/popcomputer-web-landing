import { cn } from '~/components/cn'

/** Shipnote's mark: a boat under sail, in the favicon's colours. */
export function LogoMark({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-teal-700 dark:fill-teal-500" />
      <path d="M8 19.5h16l-2.6 4.5H10.6z" fill="#fff" />
      <path d="M15 6.5v11h-6z" fill="#fde68a" />
      <path d="M17 9v8.5h5z" fill="#fff" />
    </svg>
  )
}

/** The mark and the name, linking home. */
export default function Logo({ className }: { readonly className?: string }) {
  return (
    <a
      href="/"
      className={cn(
        'flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600',
        className
      )}
    >
      <LogoMark />
      Shipnote
    </a>
  )
}
