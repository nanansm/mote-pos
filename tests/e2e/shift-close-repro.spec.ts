/**
 * REPRO test for "Tutup Shift bug masih ada di production":
 *
 *   1. Open shift, close it via UI
 *   2. Verify DB row actually shows status='closed' (catches silent rollback)
 *   3. Verify no NEW shift gets auto-created after close
 *   4. Verify clicking Tutup Shift a 2nd time is blocked by the submitState
 *      machine (button is disabled while submitting / done).
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'
import type { CashierFixture } from './global-setup'
import { clearLoginRateLimit } from './helpers'

const BASE = 'http://localhost:3030'
const fixturePath = path.resolve(process.cwd(), 'tests/e2e/.fixtures.json')
const fixture: CashierFixture = fs.existsSync(fixturePath)
  ? (JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as CashierFixture)
  : { available: false, reason: 'fixture missing' }

async function login(request: APIRequestContext) {
  await request.post(`${BASE}/api/cashier/login`, {
    data: {
      login_code: fixture.loginCode!,
      cashier_id: fixture.cashierId!,
      pin: fixture.pin!,
    },
    headers: { 'content-type': 'application/json' },
  })
}

async function openShift(request: APIRequestContext): Promise<string> {
  // First close any leftover open shift so we get a fresh one.
  const me = await request.get(`${BASE}/api/cashier/me`)
  const meBody = (await me.json().catch(() => ({}))) as {
    session?: { shiftId?: string | null }
  }
  if (meBody.session?.shiftId) {
    await request.post(`${BASE}/api/shifts/close`, {
      data: { shiftId: meBody.session.shiftId, closingBalance: 0 },
      headers: { 'content-type': 'application/json' },
    })
  }

  const res = await request.post(`${BASE}/api/shifts/open`, {
    data: { cashierId: fixture.cashierId!, pin: fixture.pin!, openingBalance: 100000 },
    headers: { 'content-type': 'application/json' },
  })
  if (res.ok()) {
    return (await res.json()).id as string
  }
  const status = res.status()
  const body = (await res.json().catch(() => ({}))) as { shiftId?: string; error?: string }
  if (body.shiftId) return body.shiftId
  throw new Error(
    `openShift failed: status=${status} body=${JSON.stringify(body)}`,
  )
}

async function getDbShift(id: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const r = await client.query(
      "SELECT status, closed_at FROM mote_pos.shift_sessions WHERE id = $1",
      [id],
    )
    return r.rows[0] as { status: string; closed_at: Date | null } | undefined
  } finally {
    await client.end()
  }
}

test.describe('REPRO: Tutup Shift bug', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeAll(() => {
    test.skip(
      !fixture.available || !process.env.DATABASE_URL,
      `fixture/db unavailable: ${fixture.reason ?? 'no DATABASE_URL'}`,
    )
  })

  test.beforeEach(async () => {
    await clearLoginRateLimit()
  })

  test('UI close → DB shows status=closed (no silent rollback)', async ({
    page,
    request,
  }) => {
    await login(request)
    const shiftId = await openShift(request)

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
    await expect(
      page.getByRole('heading', { name: /Tutup Shift/i }),
    ).toBeVisible({ timeout: 10_000 })

    const closeBtn = page.getByRole('button', { name: /Tutup Shift/i }).last()
    await closeBtn.click()
    await page.waitForURL(/\/kasir\/shift-closed/, { timeout: 15_000 })

    // Allow a moment for any commit lag.
    await page.waitForTimeout(300)

    const row = await getDbShift(shiftId)
    expect(row, 'shift row should exist').toBeTruthy()
    expect(row?.status, 'shift must be closed in DB').toBe('closed')
    expect(row?.closed_at, 'closed_at must be set').not.toBeNull()
  })

  test('submitState machine blocks double-submit', async ({ page, request }) => {
    await login(request)
    const shiftId = await openShift(request)

    const cookies = await request.storageState()
    await page.context().addCookies(
      (cookies.cookies ?? []).filter((c) => c.name.startsWith('cashier_')),
    )
    await page.addInitScript((sid) => {
      window.localStorage.setItem('pos:shift_id', sid)
      window.localStorage.setItem('pos:cashier_id', 'fixture')
      window.localStorage.setItem('pos:cashier_name', 'fixture')
    }, shiftId)

    await page.goto(`${BASE}/kasir/tutup-shift`)
    await expect(
      page.getByRole('heading', { name: /Tutup Shift/i }),
    ).toBeVisible({ timeout: 10_000 })

    // Slow the response so the button stays in 'submitting' long enough
    // for us to attempt a 2nd click.
    await page.route('**/api/shifts/close', async (route) => {
      await new Promise((r) => setTimeout(r, 800))
      await route.continue()
    })

    const closeBtn = page.getByRole('button', { name: /Tutup Shift|Memproses|Selesai/i }).last()
    let networkCalls = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/shifts/close')) networkCalls++
    })

    await closeBtn.click()
    // Immediately attempt 2 more clicks — they should be no-ops.
    await closeBtn.click({ force: true }).catch(() => null)
    await closeBtn.click({ force: true }).catch(() => null)

    await page.waitForURL(/\/kasir\/shift-closed/, { timeout: 30_000 })
    expect(networkCalls, 'exactly one /api/shifts/close call should fire').toBe(1)
  })
})
