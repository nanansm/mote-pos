import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3030'

const PAGES_PUBLIC = ['/', '/sign-in', '/sign-up', '/login-kasir']

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const path of PAGES_PUBLIC) {
      test(`public ${path} renders OK`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (err) => errors.push(err.message))
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text())
        })

        await page.goto(`${BASE_URL}${path}`)
        await page.waitForLoadState('networkidle')

        await expect(page.locator('body')).toBeVisible()

        const hasScroll = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        )
        expect(hasScroll, `Horizontal scroll on ${path}`).toBe(false)

        const critical = errors.filter(
          (e) =>
            !e.includes('Failed to find Server Action') &&
            !e.includes('preloaded') &&
            !e.includes('hydration'),
        )
        expect(critical, `Errors on ${path}: ${critical.join(', ')}`).toHaveLength(0)
      })
    }
  })
}

test.describe('Production Safety', () => {
  test('sign-up does NOT make external API calls (besides fonts)', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (req) => {
      if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
        requests.push(req.url())
      }
    })

    await page.goto(`${BASE_URL}/sign-up`)
    await page.waitForLoadState('networkidle')

    const externalApiCalls = requests.filter(
      (u) =>
        !u.startsWith(BASE_URL) &&
        !u.includes('fonts.googleapis.com') &&
        !u.includes('fonts.gstatic.com'),
    )

    expect(externalApiCalls, 'Unexpected external API calls').toHaveLength(0)
  })
})

test.describe('Auth UX', () => {
  test('password field has eye toggle icon', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-up`)

    const password = page.locator('input[name="password"]').first()
    await expect(password).toHaveAttribute('type', 'password')

    const eye = page.locator('button[aria-label*="Tampilkan"]').first()
    await expect(eye).toBeVisible()
    await eye.click()
    await expect(password).toHaveAttribute('type', 'text')
  })
})
