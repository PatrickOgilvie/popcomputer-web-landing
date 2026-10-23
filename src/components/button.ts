import { cn } from '~/components/cn'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:focus-visible:outline-teal-400 [&_svg]:size-4 [&_svg]:shrink-0'

const variants = {
  primary:
    'bg-teal-700 text-white shadow-xs hover:bg-teal-800 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400',
  secondary:
    'border border-stone-300 bg-white text-stone-950 shadow-xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:bg-stone-800',
  ghost:
    'text-stone-700 hover:bg-stone-200/60 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700',
  dangerOutline:
    'border border-red-200 bg-white text-red-700 shadow-xs hover:bg-red-50 dark:border-red-900/60 dark:bg-stone-900 dark:text-red-400 dark:hover:bg-red-950/40',
} as const

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
} as const

/** Shared button appearance for buttons, Inertia links, and Base UI parts. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  readonly variant?: keyof typeof variants
  readonly size?: keyof typeof sizes
  readonly className?: string
} = {}): string {
  return cn(base, variants[variant], sizes[size], className)
}
