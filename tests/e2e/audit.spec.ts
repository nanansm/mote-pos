import { test, expect } from '@playwright/test'
import {
  generatePrefix,
  generateLoginCode,
  isValidCodeFormat,
} from '../../src/lib/workspace/login-code'

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

        // Tolerance is generous to ignore Next.js dev-mode indicator overlay
        // and minor sub-pixel rounding; we still catch real layout overflow.
        const hasScroll = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 24,
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

test.describe('Workspace Login Code — Security', () => {
  test('/k/[invalid-format] returns 404', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/k/abc`)
    expect(response?.status()).toBe(404)
  })

  test('/k/[well-formed-but-unknown] returns 404', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/k/ZZZZ-2222`)
    expect(response?.status()).toBe(404)
  })

  test('/login-kasir shows deprecation message', async ({ page }) => {
    await page.goto(`${BASE_URL}/login-kasir`)
    await expect(page.getByText('Halaman Ini Tidak Digunakan')).toBeVisible()
  })

  test('/api/cashier/bootstrap returns 410 Gone', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cashier/bootstrap`)
    expect(response.status()).toBe(410)
  })

  test('/api/cashier/login rejects missing login_code', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cashier/login`, {
      data: { cashier_id: 'x', pin: '1234' },
    })
    expect([400, 429]).toContain(response.status())
  })

  test('/api/cashier/login rejects malformed login_code', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cashier/login`, {
      data: { login_code: 'bad-code', cashier_id: 'x', pin: '1234' },
    })
    expect([400, 429]).toContain(response.status())
  })
})

test.describe('Login Code Generator', () => {
  test('generatePrefix handles common shapes', () => {
    expect(generatePrefix('TB SUMBERLAKSANA').length).toBe(4)
    expect(generatePrefix('Warung Mamah Bungbulang').length).toBe(4)
    expect(generatePrefix('Toko').length).toBe(4)
    expect(generatePrefix('X').length).toBe(4)
    expect(generatePrefix('')).toBe('MTPS')
    expect(generatePrefix('!!!')).toBe('MTPS')
  })

  test('generateLoginCode produces valid format', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateLoginCode('Toko Test')
      expect(isValidCodeFormat(code)).toBe(true)
    }
  })

  test('isValidCodeFormat accepts canonical codes', () => {
    expect(isValidCodeFormat('TBSU-A8K3')).toBe(true)
    expect(isValidCodeFormat('MTPS-XXXX')).toBe(true)
    expect(isValidCodeFormat('WMBU-9BVC')).toBe(true)
  })

  test('isValidCodeFormat rejects invalid codes', () => {
    expect(isValidCodeFormat('TBSL-A8K')).toBe(false) // too short
    expect(isValidCodeFormat('TBSL_A8K3')).toBe(false) // underscore
    expect(isValidCodeFormat('tbsl-a8k3')).toBe(false) // lowercase
    expect(isValidCodeFormat('TBSL-0OK3')).toBe(false) // contains 0 and O
    expect(isValidCodeFormat('TBSL-1IK3')).toBe(false) // contains 1 and I
  })
})
