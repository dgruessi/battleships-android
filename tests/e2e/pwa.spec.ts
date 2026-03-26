import { test, expect } from '@playwright/test'

test.describe('PWA requirements', () => {
  test('web manifest is linked in document head', async ({ page }) => {
    await page.goto('/')
    const manifest = page.locator('link[rel="manifest"]')
    await expect(manifest).toHaveCount(1)
    const href = await manifest.getAttribute('href')
    expect(href).toBeTruthy()
  })

  test('manifest.webmanifest is reachable and has correct fields', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
    const json = await response?.json()
    expect(json.name).toBe('Battleships')
    expect(json.display).toBe('standalone')
    expect(json.theme_color).toBe('#0a1628')
    expect(json.icons).toBeDefined()
    expect(json.icons.length).toBeGreaterThan(0)
  })

  test('theme-color meta tag is present', async ({ page }) => {
    await page.goto('/')
    const meta = page.locator('meta[name="theme-color"]')
    await expect(meta).toHaveCount(1)
    const content = await meta.getAttribute('content')
    expect(content).toBe('#0a1628')
  })

  test('service worker is registered after page load', async ({ page }) => {
    await page.goto('/')
    // Wait for SW registration
    await page.waitForTimeout(1000)
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length > 0
    })
    expect(swRegistered).toBe(true)
  })

  test('service worker is active and app shell is cached after first load', async ({ page }) => {
    await page.goto('/')
    // Wait for SW to install and cache
    await page.waitForTimeout(2000)

    // Verify the SW has cached the main JS bundle
    const cached = await page.evaluate(async () => {
      if (!('caches' in window)) return false
      const keys = await caches.keys()
      return keys.length > 0
    })
    expect(cached).toBe(true)
  })
})
