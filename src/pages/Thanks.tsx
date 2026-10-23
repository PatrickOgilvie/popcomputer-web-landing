import { Head, usePoll } from '@inertiajs/react'
import type { WebPage } from '@popcomputer/web/react'
import { ArrowLeft, Check, Clock, Database, Hourglass, Mail } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

import { buttonClassName } from '~/components/button'
import { cn } from '~/components/cn'
import { formatDateTime } from '~/components/format'
import Layout from '~/components/Layout'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'

type Status = 'done' | 'waiting' | 'held'

function Step({ status, icon: Icon, title, children }: { readonly status: Status; readonly icon: typeof Check; readonly title: string; readonly children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          status === 'done' && 'bg-teal-700 text-white dark:bg-teal-500 dark:text-stone-950',
          status === 'waiting' && 'border-2 border-dashed border-stone-300 text-stone-500 dark:border-stone-700',
          status === 'held' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        )}
      >
        <Icon className={cn('size-4', status === 'waiting' && 'motion-safe:animate-pulse')} aria-hidden="true" />
      </span>
      <div className="pt-1.5">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-pretty text-stone-600 dark:text-stone-400">{children}</p>
      </div>
    </li>
  )
}

/** After the form: what this browser sent, the email the owner gets, and whether it has gone. */
const Thanks: WebPage<'Thanks'> = ({ lead }) => {
  const queued = lead?.emailStatus === 'queued'
  // While the queue holds the email, ask again every two seconds for the lead alone.
  const { stop } = usePoll(2000, { only: ['lead'] }, { autoStart: queued })
  useEffect(() => {
    if (!queued) stop()
  }, [queued, stop])

  if (lead === null) {
    return (
      <>
        <Head title="Nothing sent yet" />
        <Layout>
          <section className="mx-auto max-w-xl px-4 py-24 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Nothing sent from this browser yet</h1>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              This page shows the message this browser sent in the last day. Send one from the form and it’ll be here.
            </p>
            <a href="/#demo" className={buttonClassName({ size: 'lg', className: 'mt-8' })}>
              Book a demo
            </a>
          </section>
        </Layout>
      </>
    )
  }

  const firstName = lead.name.trim().split(/\s+/)[0] ?? lead.name

  return (
    <>
      <Head title="Thanks" />
      <Layout>
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <section>
            <a href="/" className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Shipnote
            </a>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance">Thanks, {firstName}.</h1>
            <p className="mt-4 text-lg text-pretty text-stone-600 dark:text-stone-400">
              Your message is with us. Here’s where it went, as it happens.
            </p>
            <ol className="mt-10 flex flex-col gap-6" aria-live="polite">
              <Step status="done" icon={Database} title="Saved in D1">
                {formatDateTime(lead.createdAt)}, before anything else could fail.
              </Step>
              <Step status={lead.emailStatus === 'queued' ? 'waiting' : 'done'} icon={lead.emailStatus === 'queued' ? Clock : Check} title="Queued for the owner">
                {lead.emailStatus === 'queued'
                  ? 'The queue hands it to the Worker’s consumer, usually within a few seconds.'
                  : 'The queue handed it to the Worker’s consumer.'}
              </Step>
              {lead.emailStatus === 'held' ? (
                <Step status="held" icon={Hourglass} title="Waiting for tomorrow">
                  The owner has had 50 emails today, so this one stays in the database for them to read.
                </Step>
              ) : (
                <Step status={lead.emailStatus === 'sent' ? 'done' : 'waiting'} icon={Mail} title="Emailed to the owner">
                  {lead.emailStatus === 'sent' && lead.emailedAt !== null
                    ? `Sent through Cloudflare Email Service, ${formatDateTime(lead.emailedAt)}.`
                    : 'Email Service sends it once the consumer has it.'}
                </Step>
              )}
            </ol>
          </section>

          <section aria-labelledby="email-heading">
            <h2 id="email-heading" className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              The email the owner gets
            </h2>
            <article className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-b border-stone-100 px-6 py-4 text-sm dark:border-stone-800">
                <dt className="text-stone-500">From</dt>
                <dd>Shipnote leads</dd>
                <dt className="text-stone-500">To</dt>
                <dd>The site’s owner</dd>
                <dt className="text-stone-500">Reply to</dt>
                <dd className="break-all">{lead.email.replyTo}</dd>
                <dt className="text-stone-500">Subject</dt>
                <dd className="font-medium">{lead.email.subject}</dd>
              </dl>
              <pre className="px-6 py-5 font-sans text-sm leading-relaxed whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                {lead.email.text}
              </pre>
            </article>
          </section>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <UnderTheHood route="GET /thanks" action="showThanks">
            <Guarantee>
              A cookie scoped to <code>/thanks</code> names the lead this browser sent: no other browser sees it, and
              the landing page stays cacheable.
            </Guarantee>
            <Guarantee>
              The queue carries only the lead’s id. Its consumer reads the lead from D1, emails the owner, then marks
              it sent; a repeat delivery sends nothing.
            </Guarantee>
            <Guarantee>
              The page asks for the <code>lead</code> prop alone every two seconds, and stops once the email has gone.
            </Guarantee>
          </UnderTheHood>
        </div>
      </Layout>
    </>
  )
}

export default Thanks
