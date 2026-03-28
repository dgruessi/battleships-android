import { test, expect, Page } from '@playwright/test'

async function goToBattle(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /place ships/i }).click()
  await page.getByRole('button', { name: /auto place/i }).click()
  await page.getByTestId('start-battle-btn').click()
  await expect(page.getByTestId('phase-battle')).toBeVisible()
}

/** Returns true if the page has no horizontal scrollbar (1px tolerance for sub-pixel rendering) */
const noHScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

/** Returns true if the element's bottom edge is within the viewport */
async function visibleInViewport(page: Page, testId: string): Promise<boolean> {
  const box = await page.getByTestId(testId).boundingBox()
  const vp = page.viewportSize()!
  if (!box) return false
  return box.y >= 0 && box.y + box.height <= vp.height + 2 // +2px tolerance
}

// ─── No horizontal overflow ────────────────────────────────────────────────

test.describe('No horizontal overflow', () => {
  test('title screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('phase-setup')).toBeVisible()
    expect(await noHScroll(page)).toBe(true)
  })

  test('placement phase', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /place ships/i }).click()
    await expect(page.getByTestId('phase-placement')).toBeVisible()
    expect(await noHScroll(page)).toBe(true)
  })

  test('battle phase', async ({ page }) => {
    await goToBattle(page)
    expect(await noHScroll(page)).toBe(true)
  })
})

// ─── Key elements visible without scrolling ───────────────────────────────

test.describe('Key elements visible without scrolling', () => {
  test('opponent board visible in viewport', async ({ page }) => {
    await goToBattle(page)
    expect(await visibleInViewport(page, 'opponent-board')).toBe(true)
  })

  test('player board visible in viewport', async ({ page }) => {
    await goToBattle(page)
    expect(await visibleInViewport(page, 'player-board')).toBe(true)
  })

  test('start-battle button visible in placement phase', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /place ships/i }).click()
    await expect(page.getByTestId('phase-placement')).toBeVisible()
    const startBtn = page.getByTestId('start-battle-btn')
    await startBtn.scrollIntoViewIfNeeded()
    expect(await visibleInViewport(page, 'start-battle-btn')).toBe(true)
  })

  test('difficulty picker visible on placement screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /place ships/i }).click()
    await expect(page.getByTestId('phase-placement')).toBeVisible()
    await page.getByTestId('difficulty-picker').waitFor({ state: 'visible' })
    expect(await visibleInViewport(page, 'difficulty-picker')).toBe(true)
  })
})
