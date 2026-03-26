import { describe, it, expect } from 'vitest'
import { DifficultyLevel } from '@/constants/game'
import { GRID_SIZE } from '@/constants/grid'
import { createInitialAIState } from '@/logic/aiFactory'
import { getEasyMove } from '@/logic/aiEasy'
import { createSeededRNG } from '@/utils/random'
import { toIndex } from '@/utils/coordinates'

describe('aiEasy', () => {
  it('never fires the same cell twice over 100 turns', () => {
    let aiState = createInitialAIState(DifficultyLevel.EASY)
    const fired = new Set<number>()
    const rng = createSeededRNG(42)

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const coord = getEasyMove(aiState, rng)
      const idx = toIndex(coord)
      expect(fired.has(idx)).toBe(false)
      fired.add(idx)
      aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, idx]) }
    }
  })

  it('stays within grid bounds', () => {
    let aiState = createInitialAIState(DifficultyLevel.EASY)
    const rng = createSeededRNG(7)
    for (let i = 0; i < 20; i++) {
      const coord = getEasyMove(aiState, rng)
      expect(coord.row).toBeGreaterThanOrEqual(0)
      expect(coord.row).toBeLessThan(GRID_SIZE)
      expect(coord.col).toBeGreaterThanOrEqual(0)
      expect(coord.col).toBeLessThan(GRID_SIZE)
      aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, toIndex(coord)]) }
    }
  })
})
