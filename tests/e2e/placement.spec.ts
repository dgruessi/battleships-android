import { test, expect } from '@playwright/test'

test.describe('Placement Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the title screen', async ({ page }) => {
    await expect(page.getByTestId('phase-setup')).toBeVisible()
  })

  test('shows difficulty picker on placement screen', async ({ page }) => {
    await page.getByRole('button', { name: /place ships/i }).click()
    await expect(page.getByTestId('phase-placement')).toBeVisible()
    await expect(page.getByTestId('difficulty-picker')).toBeVisible()
  })

  test('navigates to placement after clicking Place Ships', async ({ page }) => {
    await page.getByRole('button', { name: /place ships/i }).click()
    await expect(page.getByTestId('phase-placement')).toBeVisible()
  })

  test('auto-place fills 5 ships and enables Start Battle', async ({ page }) => {
    await page.getByRole('button', { name: /place ships/i }).click()
    await page.getByRole('button', { name: /auto place/i }).click()

    // All 5 ship tokens should be placed (placed class)
    const shipTokens = page.getByTestId('ship-dock').locator('[data-testid^="ship-"]')
    for (const token of await shipTokens.all()) {
      await expect(token).toHaveClass(/placed/)
    }

    // Start Battle button is enabled
    const startBtn = page.getByTestId('start-battle-btn')
    await expect(startBtn).not.toBeDisabled()
  })

  test('Start Battle transitions to battle phase', async ({ page }) => {
    await page.getByRole('button', { name: /place ships/i }).click()
    await page.getByRole('button', { name: /auto place/i }).click()
    await page.getByTestId('start-battle-btn').click()
    await expect(page.getByTestId('phase-battle')).toBeVisible()
  })

  test('Clear button removes all ships', async ({ page }) => {
    await page.getByRole('button', { name: /place ships/i }).click()
    await page.getByRole('button', { name: /auto place/i }).click()
    await page.getByRole('button', { name: /clear/i }).click()
    const startBtn = page.getByTestId('start-battle-btn')
    await expect(startBtn).toBeDisabled()
  })
})
