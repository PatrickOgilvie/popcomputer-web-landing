import { Head, useForm } from '@inertiajs/react'
import type { FormInput, WebPage } from '@popcomputer/web/react'
import { ArrowRight, Check, GitPullRequest, Inbox, Info, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { buttonClassName } from '~/components/button'
import { cn } from '~/components/cn'
import FieldError from '~/components/FieldError'
import { fieldControlClassName, fieldHintClassName, fieldLabelClassName } from '~/components/fieldStyles'
import Layout from '~/components/Layout'
import TextField from '~/components/TextField'
import Turnstile from '~/components/Turnstile'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import type { LeadForm, TeamSize } from '~/forms'
import { paths } from '~/paths'

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

const tagStyles = {
  New: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Improved: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Fixed: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
} as const

function Tag({ kind }: { readonly kind: keyof typeof tagStyles }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', tagStyles[kind])}>{kind}</span>
}

/** A changelog as Shipnote would write it, for the hero. */
function ChangelogCard() {
  const entries = [
    {
      kind: 'New',
      title: 'Share a board with a link',
      body: 'Anyone with the link can look; only your team can change it.',
      audience: 'Everyone',
    },
    {
      kind: 'Improved',
      title: 'Search finds comments too',
      body: 'Type a phrase you remember and jump straight to the thread.',
      audience: 'Pro plans',
    },
    {
      kind: 'Fixed',
      title: 'Exports keep their accents',
      body: 'Names like Zoë and Søren now survive the trip to a spreadsheet.',
      audience: 'Admins',
    },
  ] as const

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-teal-200/70 via-amber-100/60 to-sky-200/60 blur-2xl dark:from-teal-900/40 dark:via-stone-900/40 dark:to-sky-900/40"
      />
      <figure className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5 sm:p-6 dark:border-stone-800 dark:bg-stone-900">
        <figcaption className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">Larkboard · What’s new</p>
            <p className="mt-1 font-semibold">Week 42</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <GitPullRequest className="size-3.5" aria-hidden="true" />
            From 14 pull requests
          </span>
        </figcaption>
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {entries.map((entry) => (
            <li key={entry.title} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tag kind={entry.kind} />
                <p className="font-medium">{entry.title}</p>
              </div>
              <p className="mt-1.5 text-sm text-pretty text-stone-600 dark:text-stone-400">{entry.body}</p>
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-500">For: {entry.audience}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          Sent to 2,318 customers · 61% opened it
        </div>
      </figure>
    </div>
  )
}

function Hero() {
  return (
    <section className={cn(container, 'grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16')}>
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300">
          <Sparkles className="size-4" aria-hidden="true" />
          Release notes, written for you
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Release notes your customers actually read.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-pretty text-stone-600 dark:text-stone-400">
          Shipnote reads your merged pull requests, writes the changelog in plain words, and sends each customer only
          the changes they care about.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#demo" className={buttonClassName({ size: 'lg' })}>
            Book a demo
            <ArrowRight aria-hidden="true" />
          </a>
          <a href="#how-it-works" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
            See how it works
          </a>
        </div>
        <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-stone-200 pt-6 dark:border-stone-800">
          {[
            ['4 min', 'to set up'],
            ['3×', 'more notes read'],
            ['0', 'changelogs by hand'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
              <dd className="mt-1 text-sm text-stone-500 dark:text-stone-400">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ChangelogCard />
    </section>
  )
}

function SectionHeading({ eyebrow, title, children }: { readonly eyebrow: string; readonly title: string; readonly children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {children ? <p className="mt-4 text-lg text-pretty text-stone-600 dark:text-stone-400">{children}</p> : null}
    </div>
  )
}

function Features() {
  const features = [
    {
      icon: GitPullRequest,
      title: 'Written from your pull requests',
      body: 'Shipnote turns titles like “fix(export): utf8 bom” into a sentence a customer understands, and leaves the refactors out.',
    },
    {
      icon: Users,
      title: 'Sorted by who it’s for',
      body: 'Tag a change for admins, a plan or a single account. Each customer reads their own changelog, not everyone’s.',
    },
    {
      icon: Inbox,
      title: 'Sent where they already read',
      body: 'A weekly email, a widget inside your app and an RSS feed, from one draft your team reviews once.',
    },
  ]

  return (
    <section id="features" className="border-y border-stone-200 bg-white py-20 sm:py-24 dark:border-stone-800 dark:bg-stone-900/40">
      <div className={container}>
        <SectionHeading eyebrow="Features" title="Your team ships. Shipnote tells people.">
          Engineers keep writing pull requests the way they do now. Everything after the merge is Shipnote’s job.
        </SectionHeading>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-stone-200 bg-[#fffbf5] p-6 dark:border-stone-800 dark:bg-stone-950">
              <span className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white dark:bg-teal-500 dark:text-stone-950">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-pretty text-stone-600 dark:text-stone-400">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['Connect GitHub', 'Pick the repositories that ship to customers. Shipnote reads merged pull requests, never your code.'],
    ['Review the draft', 'Each Friday a draft arrives, grouped and worded. Edit a line, drop one, or approve it as it is.'],
    ['Publish everywhere', 'One click sends the email, updates the in-app widget and the public changelog page.'],
  ] as const

  return (
    <section id="how-it-works" className={cn(container, 'py-20 sm:py-24')}>
      <SectionHeading eyebrow="How it works" title="From merge to inbox in three steps" />
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map(([title, body], index) => (
          <li key={title} className="relative border-t-2 border-teal-700 pt-6 dark:border-teal-500">
            <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">0{index + 1}</span>
            <h3 className="mt-2 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-pretty text-stone-600 dark:text-stone-400">{body}</p>
          </li>
        ))}
      </ol>
      <figure className="mt-16 rounded-2xl bg-stone-900 p-8 text-stone-100 sm:p-10 dark:bg-stone-900">
        <blockquote className="max-w-3xl text-xl font-medium text-pretty sm:text-2xl">
          “We used to skip the changelog whenever the week got busy, which was every week. Now it goes out on Friday
          and customers reply to it.”
        </blockquote>
        <figcaption className="mt-6 text-sm text-stone-400">Priya, head of product at a made-up company</figcaption>
      </figure>
    </section>
  )
}

function Pricing() {
  const plans = [
    { name: 'Starter', price: '$0', period: 'for one repository', features: ['Weekly email', 'Public changelog page', '100 subscribers'] },
    {
      name: 'Team',
      price: '$29',
      period: 'a month',
      features: ['Unlimited repositories', 'In-app widget', 'Audiences and plans', '5,000 subscribers'],
      featured: true,
    },
    { name: 'Business', price: 'Let’s talk', period: 'priced by subscribers', features: ['Single sign-on', 'Custom domain', 'A person to call'] },
  ]

  return (
    <section id="pricing" className="border-y border-stone-200 bg-white py-20 sm:py-24 dark:border-stone-800 dark:bg-stone-900/40">
      <div className={container}>
        <SectionHeading eyebrow="Pricing" title="Free until it’s worth paying for" />
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={cn(
                'flex flex-col rounded-2xl border p-6',
                plan.featured
                  ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-950'
                  : 'border-stone-200 bg-[#fffbf5] dark:border-stone-800 dark:bg-stone-950'
              )}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className={cn('text-sm', plan.featured ? 'text-teal-100' : 'text-stone-500 dark:text-stone-400')}>{plan.period}</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className={cn('size-4 shrink-0', plan.featured ? 'text-teal-200' : 'text-teal-700 dark:text-teal-400')} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#demo"
                className={buttonClassName({
                  variant: plan.featured ? 'secondary' : 'primary',
                  className: cn('mt-8', plan.featured && 'border-transparent'),
                })}
              >
                {plan.name === 'Business' ? 'Talk to us' : 'Book a demo'}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Faq() {
  const questions = [
    ['Does Shipnote read our code?', 'No. It reads pull request titles, descriptions and labels, which is all it needs to write a sentence about a change.'],
    ['Can we edit what it writes?', 'Every draft waits for someone on your team to approve it. Edit any line, or turn a change into an internal note.'],
    ['What happens to the details I send below?', 'They’re stored in this demo’s D1 database for 30 days, so the owner can reply, and emailed to the owner once. Nothing else reads them.'],
    ['Is Shipnote real?', 'No: it’s an example of a landing page built on @popcomputer/web, so you can see a form protected by Turnstile, stored in D1 and emailed through Cloudflare.'],
  ] as const

  return (
    <section id="faq" className={cn(container, 'py-20 sm:py-24')}>
      <SectionHeading eyebrow="FAQ" title="Questions people ask first" />
      <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
        {questions.map(([question, answer]) => (
          <details key={question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 [&::-webkit-details-marker]:hidden">
              {question}
              <span aria-hidden="true" className="text-xl leading-none text-stone-400 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-pretty text-stone-600 dark:text-stone-400">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

const teamSizes: ReadonlyArray<{ readonly value: typeof TeamSize.Type; readonly label: string }> = [
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '200+', label: '200+' },
]

type LeadFields = Omit<FormInput<typeof LeadForm>, 'teamSize'> & { teamSize: FormInput<typeof LeadForm>['teamSize'] | '' }

function DemoForm() {
  const { data, setData, post, processing, errors, clearErrors } = useForm<LeadFields>({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
    turnstile: '',
  })
  // A Turnstile token works once: after a failed submit, ask for another.
  const [resetKey, setResetKey] = useState(0)
  const formErrors: Partial<Record<string, string>> = errors

  function field<K extends keyof LeadFields>(key: K) {
    return (value: LeadFields[K]) => {
      setData((current) => ({ ...current, [key]: value }))
      clearErrors(key)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    post(paths.leads, { preserveScroll: 'errors', onError: () => setResetKey((key) => key + 1) })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-describedby={formErrors.form ? 'lead-form-error' : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="name"
          autoComplete="name"
          maxLength={100}
          required
          value={data.name}
          error={errors.name}
          disabled={processing}
          onChange={(event) => field('name')(event.target.value)}
        />
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={data.email}
          error={errors.email}
          disabled={processing}
          onChange={(event) => field('email')(event.target.value)}
        />
      </div>
      <TextField
        label="Company"
        name="company"
        autoComplete="organization"
        maxLength={100}
        labelAside={<span className={fieldHintClassName}>Optional</span>}
        value={data.company ?? ''}
        error={errors.company}
        disabled={processing}
        onChange={(event) => field('company')(event.target.value)}
      />

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.teamSize ? 'team-size-error' : undefined}>
        <legend className={cn(fieldLabelClassName, 'mb-2')}>How many people ship your product?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {teamSizes.map((size) => (
            <label
              key={size.value}
              className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white text-sm font-medium tabular-nums has-checked:border-teal-700 has-checked:bg-teal-50 has-checked:text-teal-900 has-focus-visible:outline-2 has-focus-visible:outline-teal-600 dark:border-stone-700 dark:bg-stone-900 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950 dark:has-checked:text-teal-100"
            >
              <input
                type="radio"
                name="teamSize"
                value={size.value}
                className="sr-only"
                checked={data.teamSize === size.value}
                disabled={processing}
                onChange={() => field('teamSize')(size.value)}
              />
              {size.label}
            </label>
          ))}
        </div>
        <FieldError id="team-size-error" message={errors.teamSize ? 'Choose your team’s size.' : undefined} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="message" className={fieldLabelClassName}>
            What should the demo cover?
          </label>
          <span className={fieldHintClassName}>Optional</span>
        </div>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          value={data.message ?? ''}
          disabled={processing}
          placeholder="We ship weekly and nobody reads the notes…"
          className={cn(fieldControlClassName, 'py-2')}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'message-error' : undefined}
          onChange={(event) => field('message')(event.target.value)}
        />
        <FieldError id="message-error" message={errors.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Turnstile action="lead" resetKey={resetKey} onToken={field('turnstile')} />
        <FieldError id="turnstile-error" message={errors.turnstile} />
      </div>

      <FieldError id="lead-form-error" message={formErrors.form} />

      <button type="submit" disabled={processing || data.turnstile === ''} className={buttonClassName({ size: 'lg' })}>
        {processing ? 'Sending…' : 'Book my demo'}
      </button>
      <p className={cn(fieldHintClassName, 'flex gap-2')}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        We keep these details for 30 days, only to reply to you. In this demo they reach the site’s owner, nobody else.
      </p>
    </form>
  )
}

function Demo() {
  return (
    <section id="demo" className="bg-stone-900 py-20 text-stone-100 sm:py-24 dark:bg-stone-900/60">
      <div className={cn(container, 'grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16')}>
        <div>
          <p className="text-sm font-semibold text-teal-300">Book a demo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Twenty minutes, your own pull requests
          </h2>
          <p className="mt-4 text-lg text-pretty text-stone-300">
            Tell us a little about your team. We’ll reply within a working day with a time, and bring a changelog
            drafted from one of your public repositories.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-stone-200">
            {['A draft from your own repository', 'Your questions about audiences and plans', 'No slides, no sales script'].map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-teal-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 flex items-start gap-3 rounded-xl border border-stone-700 p-4 text-sm text-stone-300">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
            Try it: the form below is real. Your message is checked by Turnstile, kept in D1 and emailed to this
            site’s owner through Cloudflare Email Service, and the next page shows you the email.
          </p>
        </div>
        <div className="rounded-2xl bg-[#fffbf5] p-6 text-stone-900 shadow-2xl sm:p-8 dark:bg-stone-950 dark:text-stone-100">
          <DemoForm />
        </div>
      </div>
    </section>
  )
}

/** Shipnote's landing page: what it does, its prices, and a form that books a demo. */
const Landing: WebPage<'Landing'> = () => (
  <>
    <Head title="Release notes your customers actually read" />
    <Layout>
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Faq />
      <Demo />
      <div className={cn(container, 'py-12')}>
        <UnderTheHood route="POST /leads" action="sendLead">
          <Guarantee>
            The page reads nothing per visitor, so Cloudflare’s edge serves it from its cache; only the form’s post
            runs the Worker’s logic.
          </Guarantee>
          <Guarantee>
            Turnstile’s token is checked on the server with <code>siteverify</code>, for this form’s action and this
            site’s host, and works once.
          </Guarantee>
          <Guarantee>A Rate Limiting binding lets one address send five messages a minute.</Guarantee>
          <Guarantee>
            The lead is written to D1 before anything else, then queued: a slow or failing email never loses it, and
            the queue retries a send that fails.
          </Guarantee>
          <Guarantee>
            The owner’s address is a secret, the only one the Worker emails, from the one sender the{' '}
            <code>send_email</code> binding allows, 50 a day at most.
          </Guarantee>
          <Guarantee>A daily Cron Trigger deletes leads after 30 days.</Guarantee>
        </UnderTheHood>
      </div>
    </Layout>
  </>
)

export default Landing
