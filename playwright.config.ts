import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    // Desktop
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile phones
    {
      name: 'pixel-5',
      use: { ...devices['Pixel 5'] },          // 393×851
    },
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] },         // 375×667 — smallest target
    },
    {
      name: 'iphone-14',
      use: { ...devices['iPhone 14'] },         // 390×844
    },
    {
      name: 'galaxy-s21',
      use: { ...devices['Galaxy S21'] },        // 360×800
    },
    // Tablet
    {
      name: 'ipad',
      use: { ...devices['iPad'] },              // 768×1024
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
  },
})
