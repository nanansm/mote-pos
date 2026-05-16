import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import type { CashierFixture } from './global-setup'

const BASE = 'http://localhost:3030'
const OWNER_EMAIL = 'smnanan@gmail.com'
const OWNER_PASSWORD = 'Mote123!'

const fixturePath = path.resolve(process.cwd(), 'tests/e2e/.fixtures.json')
const fixture: CashierFixture = fs.existsSync(fixturePath)
  ? (JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as CashierFixture)
  : { available: false, reason: 'fixture file missing — global-setup did not run' }

async function loginOwner(
  page: Page,
  email: string = OWNER_EMAIL,
  password: string = OWNER_PASSWORD,
) {
  await page.goto(`${BASE}/sign-in`)
  await page.locator('#email').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(dashboard|onboarding|kasir)/, { timeout: 15_000 })
}

async function loginCashier(
  page: Page,
  code: string,
  cashierName: string,
  pin: string,
) {
  await page.goto(`${BASE}/k/${code}`)
  // Outlet is auto-selected when there is only 1 active outlet (our fixture
  // workspace WMBU has 1 outlet, so the cashier list appears immediately).
  const cashierButton = page
    .getByRole('button', { name: new RegExp(cashierName, 'i') })
    .first()
  await expect(cashierButton).toBeVisible({ timeout: 10_000 })
  await cashierButton.click()

  await page.locator('input[type="password"]').fill(pin)
  await Promise.all([
    page.waitForURL(/\/kasir(\/|$)/, { timeout: 20_000 }),
    page.locator('button[type="submit"]').click(),
  ])
}

test.describe('Cashier auth flow', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('owner login then access /kasir/buka-shift succeeds', async ({ page }) => {
    await loginOwner(page)
    await page.goto(`${BASE}/kasir/buka-shift`)
    // Allow Next a tick to settle, then assert no redirect to /sign-in.
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toContain('/sign-in')
    expect(page.url()).toContain('/kasir/buka-shift')
  })

  test('cashier login via /k/[code] then access /kasir succeeds', async ({
    page,
    context,
  }) => {
    test.skip(
      !fixture.available,
      `cashier fixture unavailable: ${fixture.reason ?? 'unknown'}`,
    )
    await loginCashier(
      page,
      fixture.loginCode!,
      fixture.cashierName!,
      fixture.pin!,
    )
    expect(page.url()).not.toContain('/sign-in')
    expect(page.url()).toMatch(/\/kasir(\/|$)/)

    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'cashier_session_token')).toBeTruthy()

    // CashierShell sidebar: cashier sees core POS + customer + reports menus
    await expect(page.locator('aside').getByRole('link', { name: 'Kasir', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Transaksi', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Pelanggan', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Hutang', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Titipan Uang', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Titipan Barang', exact: true })).toBeVisible()
    await expect(page.locator('aside').getByRole('link', { name: 'Pengaturan', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Logout Kasir/i })).toBeVisible()

    // Owner-only nav must NOT be present in cashier sidebar
    await expect(page.locator('aside').getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)
    await expect(page.locator('aside').getByRole('link', { name: 'Produk', exact: true })).toHaveCount(0)
    await expect(page.locator('aside').getByRole('link', { name: 'Kategori', exact: true })).toHaveCount(0)
    await expect(page.locator('aside').getByRole('link', { name: 'Modifier', exact: true })).toHaveCount(0)
    await expect(page.locator('aside').getByRole('link', { name: 'Kasir & Shift', exact: true })).toHaveCount(0)
  })

  test('cashier session blocks owner-only routes', async ({ page }) => {
    test.skip(
      !fixture.available,
      `cashier fixture unavailable: ${fixture.reason ?? 'unknown'}`,
    )
    await loginCashier(
      page,
      fixture.loginCode!,
      fixture.cashierName!,
      fixture.pin!,
    )
    await page.goto(`${BASE}/produk`)
    // Layout redirects cashiers away from owner pages → /kasir
    await page.waitForURL(/\/(kasir|sign-in)(\/|$|\?)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(kasir|sign-in)(\/|$|\?)/)
    expect(page.url()).not.toContain('/produk')
  })

  test('no session redirects /kasir to /sign-in', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(`${BASE}/kasir`)
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('/sign-in')
  })

  test('invalid /k/[code] returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/k/INVALID-XXXX`)
    expect(res?.status()).toBe(404)
  })

  test('cashier logout clears session', async ({ page, context }) => {
    test.skip(
      !fixture.available,
      `cashier fixture unavailable: ${fixture.reason ?? 'unknown'}`,
    )
    await loginCashier(
      page,
      fixture.loginCode!,
      fixture.cashierName!,
      fixture.pin!,
    )
    await page.getByRole('button', { name: /Logout Kasir/i }).click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'cashier_session_token')).toBeFalsy()

    await page.goto(`${BASE}/kasir`)
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('/sign-in')
  })
})
