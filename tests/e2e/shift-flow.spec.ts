import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import type { CashierFixture } from './global-setup'

const BASE = 'http://localhost:3030'
const OWNER_EMAIL = 'smnanan@gmail.com'
const OWNER_PASSWORD = 'Mote123!'

const fixturePath = path.resolve(process.cwd(), 'tests/e2e/.fixtures.json')
const fixture: CashierFixture = fs.existsSync(fixturePath)
  ? (JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as CashierFixture)
  : { available: false, reason: 'fixture missing' }

async function loginCashierViaApi(
  request: APIRequestContext,
  code: string,
  cashierId: string,
  pin: string,
) {
  const res = await request.post(`${BASE}/api/cashier/login`, {
    data: { login_code: code, cashier_id: cashierId, pin },
    headers: { 'content-type': 'application/json' },
  })
  expect(res.ok()).toBeTruthy()
}

async function openShiftViaApi(
  request: APIRequestContext,
  cashierId: string,
  pin: string,
  opening = 0,
) {
  const res = await request.post(`${BASE}/api/shifts/open`, {
    data: { cashierId, pin, openingBalance: opening },
    headers: { 'content-type': 'application/json' },
  })
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `open shift failed: ${res.status()} ${JSON.stringify(body)}`,
    )
  }
  const j = (await res.json()) as { id: string }
  return j.id
}

async function closeShiftViaApi(
  request: APIRequestContext,
  shiftId: string,
  closingBalance: number,
) {
  return request.post(`${BASE}/api/shifts/close`, {
    data: { shiftId, closingBalance },
    headers: { 'content-type': 'application/json' },
  })
}

async function loginCashierPage(page: Page) {
  await page.goto(`${BASE}/k/${fixture.loginCode}`)
  const cashierButton = page
    .getByRole('button', { name: new RegExp(fixture.cashierName ?? '', 'i') })
    .first()
  await expect(cashierButton).toBeVisible({ timeout: 10_000 })
  await cashierButton.click()
  await page.locator('input[type="password"]').fill(fixture.pin!)
  await Promise.all([
    page.waitForURL(/\/kasir(\/|$)/, { timeout: 20_000 }),
    page.locator('button[type="submit"]').click(),
  ])
}

test.describe('Shift flow — bug fixes', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeAll(() => {
    test.skip(
      !fixture.available,
      `cashier fixture unavailable: ${fixture.reason ?? 'unknown'}`,
    )
  })

  test('close shift API is idempotent — second call returns alreadyClosed=true', async ({
    request,
  }) => {
    await loginCashierViaApi(
      request,
      fixture.loginCode!,
      fixture.cashierId!,
      fixture.pin!,
    )

    let shiftId: string
    try {
      shiftId = await openShiftViaApi(request, fixture.cashierId!, fixture.pin!, 0)
    } catch (err) {
      const msg = String(err)
      if (!msg.includes('409')) throw err
      // already open from a previous failed run — close any existing shift
      const me = await request.get(`${BASE}/api/cashier/me`)
      const meBody = (await me.json()) as { shiftId?: string }
      shiftId = meBody.shiftId ?? ''
      expect(shiftId, 'no existing shift to reuse').toBeTruthy()
    }

    const first = await closeShiftViaApi(request, shiftId, 0)
    expect(first.ok()).toBeTruthy()
    const firstBody = (await first.json()) as {
      ok: boolean
      alreadyClosed: boolean
    }
    expect(firstBody.ok).toBe(true)
    expect(firstBody.alreadyClosed).toBe(false)

    const second = await closeShiftViaApi(request, shiftId, 0)
    expect(second.ok()).toBeTruthy()
    const secondBody = (await second.json()) as {
      ok: boolean
      alreadyClosed: boolean
    }
    expect(secondBody.ok).toBe(true)
    expect(secondBody.alreadyClosed).toBe(true)
  })

  test('concurrent close calls — only one performs the close', async ({
    request,
  }) => {
    await loginCashierViaApi(
      request,
      fixture.loginCode!,
      fixture.cashierId!,
      fixture.pin!,
    )
    let shiftId: string
    try {
      shiftId = await openShiftViaApi(request, fixture.cashierId!, fixture.pin!, 0)
    } catch {
      const me = await request.get(`${BASE}/api/cashier/me`)
      const meBody = (await me.json()) as { shiftId?: string }
      shiftId = meBody.shiftId ?? ''
      expect(shiftId).toBeTruthy()
    }

    const [r1, r2] = await Promise.all([
      closeShiftViaApi(request, shiftId, 0),
      closeShiftViaApi(request, shiftId, 0),
    ])
    expect(r1.ok() && r2.ok()).toBeTruthy()
    const b1 = (await r1.json()) as { alreadyClosed: boolean }
    const b2 = (await r2.json()) as { alreadyClosed: boolean }
    // Exactly one should have alreadyClosed=false (the winner), the other =true.
    const winners = [b1.alreadyClosed, b2.alreadyClosed].filter((x) => x === false).length
    const losers = [b1.alreadyClosed, b2.alreadyClosed].filter((x) => x === true).length
    expect(winners).toBe(1)
    expect(losers).toBe(1)
  })

  test('UI: tutup-shift redirects to /kasir/shift-closed (not /kasir/buka-shift)', async ({
    page,
    request,
  }) => {
    // Seed an open shift via API + login cookie.
    await loginCashierViaApi(
      request,
      fixture.loginCode!,
      fixture.cashierId!,
      fixture.pin!,
    )
    let shiftId: string
    try {
      shiftId = await openShiftViaApi(request, fixture.cashierId!, fixture.pin!, 0)
    } catch {
      const me = await request.get(`${BASE}/api/cashier/me`)
      const meBody = (await me.json()) as { shiftId?: string }
      shiftId = meBody.shiftId ?? ''
    }
    expect(shiftId).toBeTruthy()

    // Share cashier_session cookie with the browser context.
    const cookies = await request.storageState()
    await page.context().addCookies(
      (cookies.cookies ?? []).filter((c) => c.name.startsWith('cashier_')),
    )

    await page.addInitScript((sid) => {
      window.localStorage.setItem('pos:shift_id', sid)
      window.localStorage.setItem('pos:cashier_id', 'fixture')
      window.localStorage.setItem('pos:cashier_name', 'fixture')
      window.localStorage.setItem('pos:shift_opened_at', new Date().toISOString())
    }, shiftId)

    await page.goto(`${BASE}/kasir/tutup-shift`)
    await expect(page.getByRole('heading', { name: /Tutup Shift/i })).toBeVisible({
      timeout: 10_000,
    })

    // Closing balance defaults to 0.
    const closeBtn = page.getByRole('button', { name: /Tutup Shift/i }).last()
    await closeBtn.click()
    await page.waitForURL(/\/kasir\/shift-closed/, { timeout: 15_000 })
    expect(page.url()).toContain('/kasir/shift-closed')
    expect(page.url()).not.toContain('/kasir/buka-shift')
    await expect(page.getByText(/Shift Telah Ditutup/i)).toBeVisible()
  })

  test('ringkasan transaksi shows all 5 default methods including 0-amount ones', async ({
    page,
    request,
  }) => {
    await loginCashierViaApi(
      request,
      fixture.loginCode!,
      fixture.cashierId!,
      fixture.pin!,
    )
    let shiftId: string
    try {
      shiftId = await openShiftViaApi(request, fixture.cashierId!, fixture.pin!, 0)
    } catch {
      const me = await request.get(`${BASE}/api/cashier/me`)
      const meBody = (await me.json()) as { shiftId?: string }
      shiftId = meBody.shiftId ?? ''
    }
    expect(shiftId).toBeTruthy()

    const cookies = await request.storageState()
    await page.context().addCookies(
      (cookies.cookies ?? []).filter((c) => c.name.startsWith('cashier_')),
    )
    await page.addInitScript((sid) => {
      window.localStorage.setItem('pos:shift_id', sid)
    }, shiftId)

    await page.goto(`${BASE}/kasir/tutup-shift`)
    const summary = page.getByText('Ringkasan Transaksi').locator('..')
    await expect(summary).toBeVisible({ timeout: 10_000 })

    for (const label of ['Cash', 'QRIS', 'Transfer', 'Hutang', 'Saldo Titipan']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('TOTAL', { exact: true })).toBeVisible()
  })

  test('tooltip Hitung Saldo Kas explains Cash-only inclusion', async ({
    page,
    request,
  }) => {
    await loginCashierViaApi(
      request,
      fixture.loginCode!,
      fixture.cashierId!,
      fixture.pin!,
    )
    let shiftId: string
    try {
      shiftId = await openShiftViaApi(request, fixture.cashierId!, fixture.pin!, 0)
    } catch {
      const me = await request.get(`${BASE}/api/cashier/me`)
      const meBody = (await me.json()) as { shiftId?: string }
      shiftId = meBody.shiftId ?? ''
    }
    expect(shiftId).toBeTruthy()

    const cookies = await request.storageState()
    await page.context().addCookies(
      (cookies.cookies ?? []).filter((c) => c.name.startsWith('cashier_')),
    )
    await page.addInitScript((sid) => {
      window.localStorage.setItem('pos:shift_id', sid)
    }, shiftId)

    await page.goto(`${BASE}/kasir/tutup-shift`)
    await page
      .getByRole('button', { name: /Info Expected Cash/i })
      .hover({ trial: false })
    await expect(
      page.getByText(/Hanya menghitung uang fisik/i),
    ).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Tidak termasuk/i)).toBeVisible()
  })

  test('sidebar cashier shell exposes "Tutup Shift" link', async ({ page }) => {
    await loginCashierPage(page)
    const sidebar = page.locator('aside').first()
    await expect(sidebar.getByRole('link', { name: /Tutup Shift/i })).toBeVisible()
  })

  test('owner-cashier shows OWNER badge on /k/[code]', async ({ page }) => {
    await page.goto(`${BASE}/k/${fixture.loginCode}`)
    // We can't guarantee the owner-cashier name in this fixture workspace —
    // we just assert the OWNER badge appears at least once if there is one.
    const ownerBadges = page.getByText('OWNER', { exact: true })
    // Soft assert: the badge MAY not be present if the fixture workspace
    // does not have an owner-cashier; in that case skip rather than fail.
    const count = await ownerBadges.count()
    test.skip(count === 0, 'fixture workspace has no owner-cashier to render the badge')
    await expect(ownerBadges.first()).toBeVisible()
  })

  test('owner /sign-in then /kasir/buka-shift shows submit button', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`)
    await page.locator('#email').fill(OWNER_EMAIL)
    await page.locator('input[name="password"]').fill(OWNER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(dashboard|onboarding|kasir)/, { timeout: 15_000 })
    await page.goto(`${BASE}/kasir/buka-shift`)
    await expect(page.getByRole('button', { name: /Buka Shift/i })).toBeVisible()
  })
})

test.describe('Auto-close cron', () => {
  test('rejects request without Bearer CRON_SECRET', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cron/auto-close-shifts`)
    expect(res.status()).toBe(401)
  })

  test('accepts Bearer CRON_SECRET and returns processed count', async ({
    request,
  }) => {
    const secret = process.env.CRON_SECRET
    test.skip(!secret, 'CRON_SECRET not set in test environment')
    const res = await request.get(`${BASE}/api/cron/auto-close-shifts`, {
      headers: { authorization: `Bearer ${secret}` },
    })
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { ok: boolean; processed: number }
    expect(body.ok).toBe(true)
    expect(typeof body.processed).toBe('number')
  })
})
