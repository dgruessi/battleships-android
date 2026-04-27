import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 45_000,
    hookTimeout: 30_000,
    include: ['tests/functions/**/*.test.ts', 'tests/multiplayer/**/*.test.ts'],
    poolOptions: { forks: { singleFork: true } },
    reporters: ['verbose'],
  },
  resolve: {
    conditions: ['node', 'import', 'default'],
    alias: { '@functions': resolve(__dirname, './functions/src') },
  },
})
