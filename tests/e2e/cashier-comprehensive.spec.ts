import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import type { CashierFixture } from './global-setup'

const BASE = 'http://localhost:3030'
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'playwright-report/screenshots')

const fixturePath = path.resolve(process.cwd(), 'tests/e2e/.fixtures.json')
const fixture: CashierFixture = fs.existsSync(fixturePath)
  ? (JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as CashierFixture)
  : { available: false, reason: 'fixture file missing — global-setup did not run' }

const CASHIER_ROUTES = [
  { path: '/kasir', label: 'kasir-main' },
  { path: '/kasir/buka-shift', label: 'kasir-buka-shift' },
  { path: '/transaksi', label: 'transaksi-list' },
  { path: '/pelanggan', label: 'pelanggan-list' },
  { path: '/hutang', label: 'hutang-list' },
  { path: '/titipan-uang', label: 'titipan-uang-list' },
  { path: '/titipan-barang', label: 'titipan-barang-list' },
  { path: '/laporan/penjualan', label: 'laporan-penjualan' },
  { path: '/laporan/produk', label: 'laporan-produk' },
  { path: '/laporan/shift', label: 'laporan-shift' },
  { path: '/laporan/z-report', label: 'laporan-z-report' },
  { path: '/pengaturan?tab=outlet', label: 'pengaturan-outlet' },
] as const

const OWNER_ONLY_ROUTES = [
  '/dashboard',
  '/produk',
  '/kategori',
  '/modifier',
  '/kasir-list',
] as const

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

async function loginCashier(
  page: Page,
  code: string,
  cashierName: string,
  pin: string,
) {
  await page.goto(`${BASE}/k/${code}`)
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

function ensureDirSync(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}
ensureDirSync(SCREENSHOT_DIR)

for (const viewport of VIEWPORTS) {
  test.describe(`Cashier routes — ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test.beforeEach(async ({ page }) => {
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
    })

    for (const route of CASHIER_ROUTES) {
      test(`${route.path} renders, no horizontal scroll, no critical errors`, async ({
        page,
      }) => {
        const errors: string[] = []
        page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`))
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`)
        })

        const response = await page.goto(`${BASE}${route.path}`)
        await page.waitForLoadState('networkidle').catch(() => {})

        expect(
          response?.status() ?? 0,
          `${route.path} returned 4xx/5xx`,
        ).toBeLessThan(400)

        await expect(page.locator('body')).toBeVisible()

        // Allow generous tolerance for dev-mode overlay; we still catch real overflow.
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(
          overflow,
          `Horizontal scroll on ${route.path}: ${overflow}px`,
        ).toBeLessThanOrEqual(24)

        // On desktop the sidebar must be visible (not overlapping main).
        if (viewport.name === 'desktop') {
          const aside = page.locator('aside').first()
          await expect(aside).toBeVisible()
          const asideBox = await aside.boundingBox()
          expect(asideBox?.x ?? 0).toBe(0)
        }

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${viewport.name}-${route.label}.png`),
          fullPage: true,
        })

        const critical = errors.filter(
          (e) =>
            !e.includes('Failed to find Server Action') &&
            !e.includes('preloaded') &&
            !e.toLowerCase().includes('hydration') &&
            !e.includes('manifest') &&
            !e.includes('favicon'),
        )
        expect(
          critical,
          `Console/page errors on ${route.path}:\n${critical.join('\n')}`,
        ).toHaveLength(0)
      })
    }
  })
}

test.describe('Owner-only routes block cashier', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
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
  })

  for (const route of OWNER_ONLY_ROUTES) {
    test(`cashier blocked from ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`)
      await page.waitForLoadState('networkidle').catch(() => {})
      const url = page.url()
      const cleanPath = url.replace(BASE, '').split('?')[0]
      expect(cleanPath, `Cashier reached ${route}`).not.toBe(route)
      expect(url).toMatch(/\/(kasir|sign-in)(\/|$|\?)/)
    })
  }

  test('cashier hitting /pengaturan?tab=integrasi redirects to outlet tab', async ({
    page,
  }) => {
    await page.goto(`${BASE}/pengaturan?tab=integrasi`)
    await page.waitForLoadState('networkidle').catch(() => {})
    expect(page.url()).toContain('tab=outlet')
  })
})

test.describe('Cashier sidebar menu is complete', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('all 7 primary sidebar entries are reachable without 404', async ({
    page,
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

    const entries = [
      { name: /^Kasir$/, expectUrlPart: '/kasir' },
      { name: /^Transaksi$/, expectUrlPart: '/transaksi' },
      { name: /^Pelanggan$/, expectUrlPart: '/pelanggan' },
      { name: /^Hutang$/, expectUrlPart: '/hutang' },
      { name: /^Titipan Uang$/, expectUrlPart: '/titipan-uang' },
      { name: /^Titipan Barang$/, expectUrlPart: '/titipan-barang' },
      { name: /^Pengaturan$/, expectUrlPart: '/pengaturan' },
    ]

    for (const e of entries) {
      const link = page.locator('aside').getByRole('link', { name: e.name }).first()
      await expect(link, `sidebar link ${e.name} missing`).toBeVisible()
      await link.click()
      await page.waitForLoadState('networkidle').catch(() => {})
      expect(page.url()).toContain(e.expectUrlPart)
      const has404 = await page
        .getByText(/404|not.?found/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(has404, `${e.expectUrlPart} returned 404`).toBe(false)
    }
  })

  test('Laporan submenu opens to penjualan/produk/shift/z-report', async ({
    page,
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

    const submenu = ['Penjualan', 'Produk', 'Shift', 'Z-Report']
    for (const label of submenu) {
      const link = page.locator('aside').getByRole('link', { name: label, exact: true })
      await expect(link.first()).toBeVisible({ timeout: 5_000 })
    }
  })
})
