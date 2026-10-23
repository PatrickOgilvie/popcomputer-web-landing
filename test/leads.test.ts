import { describe, expect, test } from 'bun:test'
import { readPage, testBrowser, testClock, testEnv } from '@popcomputer/web/testing'
import { DAILY_EMAIL_LIMIT, ownerEmail } from '../src/leads'
import { paths } from '../src/paths'
import worker from '../src/worker'
import { app, grace, landing, send, visit } from './app'

const DAY = 24 * 60 * 60 * 1000

describe('the landing page', () => {
  test('anyone sees it, with nothing of theirs in it', async () => {
    const { env } = await landing()
    const res = await app.request(paths.home, visit, env)

    expect(res.status).toBe(200)
    expect((await readPage(res, 'Landing')).props).toMatchObject({})
  })
})

describe('the form', () => {
  test('keeps the lead, queues the owner’s email, and shows this browser what it sent', async () => {
    const { env, bindings, queued } = await landing()
    const browser = testBrowser(app, env)

    const res = await browser.request(paths.leads, send('POST', grace))

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe(paths.thanks)
    expect(queued).toHaveLength(1)

    const row = await bindings.DB.prepare('SELECT name, email, team_size, email_status FROM leads').first()

    expect(row).toEqual({ name: 'Grace Hopper', email: 'grace@example.com', team_size: '11-50', email_status: 'queued' })

    const thanks = await readPage(await browser.request(paths.thanks, visit), 'Thanks')

    expect(thanks.props.lead).toMatchObject({ name: 'Grace Hopper', emailStatus: 'queued', emailedAt: null })
    expect(thanks.props.lead?.email.subject).toBe('New demo request: Grace Hopper at Harvard Computation Lab')
  })

  test('the thank-you page shows nothing to a browser that sent nothing', async () => {
    const { env } = await landing()
    await testBrowser(app, env).request(paths.leads, send('POST', grace))

    const stranger = await readPage(await testBrowser(app, env).request(paths.thanks, visit), 'Thanks')

    expect(stranger.props.lead).toBeNull()
  })

  test('a token Turnstile refuses keeps nothing, and says so beside the check', async () => {
    const { env, bindings, queued } = await landing()
    const browser = testBrowser(app, env)
    await browser.request(paths.home, visit)

    const res = await browser.request(paths.leads, send('POST', { ...grace, turnstile: 'a-bot-made-this' }))
    const page = await readPage(await browser.follow(res), 'Landing')

    expect(page.props.errors.turnstile).toMatch(/couldn’t confirm/)
    expect(queued).toEqual([])
    expect(await bindings.DB.prepare('SELECT count(*) AS leads FROM leads').first()).toEqual({ leads: 0 })
  })

  test('checks the fields before it asks Turnstile', async () => {
    const { env } = await landing()
    const browser = testBrowser(app, env)
    await browser.request(paths.home, visit)

    const res = await browser.request(paths.leads, send('POST', { ...grace, name: '', email: 'not-an-email', teamSize: '9000' }))
    const page = await readPage(await browser.follow(res), 'Landing')

    expect(Object.keys(page.props.errors).sort()).toEqual(['email', 'name', 'teamSize'])
  })

  test('one address sends five messages a minute at most', async () => {
    const { env, queued } = await landing()
    const browser = testBrowser(app, env)
    await browser.request(paths.home, visit)

    for (let message = 0; message < 5; message++) await browser.request(paths.leads, send('POST', grace))
    const sixth = await browser.request(paths.leads, send('POST', grace))
    const page = await readPage(await browser.follow(sixth), 'Landing')

    expect(page.props.errors.form).toMatch(/few messages/)
    expect(queued).toHaveLength(5)
  })
})

describe('the owner’s email', () => {
  test('goes from the queue to the owner, with a reply that reaches the lead', async () => {
    const { env, inbox, deliver } = await landing()
    const browser = testBrowser(app, env)
    await browser.request(paths.leads, send('POST', grace))

    const batch = await deliver()

    expect(batch.acked()).toHaveLength(1)
    expect(inbox.emails).toHaveLength(1)
    expect(inbox.emails[0]).toMatchObject({
      from: { email: 'leads@example.com' },
      to: 'owner@example.com',
      subject: 'New demo request: Grace Hopper at Harvard Computation Lab',
      replyTo: { email: 'grace@example.com', name: 'Grace Hopper' },
    })

    const thanks = await readPage(await browser.request(paths.thanks, visit), 'Thanks')

    expect(thanks.props.lead).toMatchObject({ emailStatus: 'sent' })
    expect(thanks.props.lead?.emailedAt).not.toBeNull()
  })

  test('a send that fails goes back to the queue, and a repeat delivery sends once', async () => {
    const { env, inbox, queued, deliver } = await landing()
    await testBrowser(app, env).request(paths.leads, send('POST', grace))
    const message = queued[0]
    inbox.down = true

    const failed = await deliver()

    expect(failed.retried()).toHaveLength(1)

    inbox.down = false
    queued.push(message ?? { leadId: '' }, message ?? { leadId: '' })
    const retried = await deliver()

    expect(retried.acked()).toHaveLength(2)
    expect(inbox.emails).toHaveLength(1)
  })

  test(`stops at ${DAILY_EMAIL_LIMIT} a day; the rest wait in the database`, async () => {
    const { env, bindings, inbox, queued, deliver } = await landing()
    const now = Date.now()
    const insert = bindings.DB.prepare(
      "INSERT INTO leads (id, name, email, team_size, created_at, email_status, emailed_at) VALUES (?, 'Earlier', 'earlier@example.com', '1-10', ?, 'sent', ?)"
    )
    await bindings.DB.batch(Array.from({ length: DAILY_EMAIL_LIMIT }, (_, n) => insert.bind(`earlier-${n}`, now - 1000, now - 1000)))
    await testBrowser(app, env).request(paths.leads, send('POST', grace))
    const leadId = queued[0]?.leadId

    await deliver()

    expect(inbox.emails).toEqual([])
    expect(await bindings.DB.prepare('SELECT email_status FROM leads WHERE id = ?').bind(leadId).first()).toEqual({
      email_status: 'held',
    })
  })

  test('escapes what the lead wrote, and keeps the subject to one line', () => {
    const email = ownerEmail({
      name: 'Mallory\r\nBcc: everyone@example.com',
      email: 'mallory@example.com',
      company: null,
      teamSize: '1-10',
      message: '<script>alert(1)</script>',
    })

    expect(email.subject).toBe('New demo request: Mallory Bcc: everyone@example.com')
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(email.html).not.toContain('<script>')
  })
})

describe('keeping leads', () => {
  test('the daily sweep deletes leads older than 30 days', async () => {
    const { env, bindings } = await landing()
    await testBrowser(app, env).request(paths.leads, send('POST', grace))
    const time = await testClock(Date.now() + 31 * DAY)

    await worker.scheduled({ cron: '0 3 * * *', scheduledTime: Date.now() }, testEnv(time.layer, bindings))

    expect(await bindings.DB.prepare('SELECT count(*) AS leads FROM leads').first()).toEqual({ leads: 0 })
  })
})
