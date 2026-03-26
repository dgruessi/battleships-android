import { DifficultyLevel } from '@/constants/game'
import { GRID_SIZE } from '@/constants/grid'
import { AIState, BoardState, Coordinate } from '@/models/types'
import { getEasyMove } from '@/logic/aiEasy'
import { getMediumMove, updateMediumStateAfterHit, updateMediumStateAfterMiss, updateMediumStateAfterSunk } from '@/logic/aiMedium'
import { getHardMove, updateHardStateAfterHit, updateHardStateAfterMiss, updateHardStateAfterSunk } from '@/logic/aiHard'
import { RNG, createDefaultRNG } from '@/utils/random'

export function createInitialAIState(difficulty: DifficultyLevel): AIState {
  return {
    difficulty,
    huntMode: true,
    targetQueue: [],
    lastHit: null,
    hitStreak: [],
    probabilityMap: new Array(GRID_SIZE * GRID_SIZE).fill(0) as number[],
    shotHistory: new Set(),
  }
}

export function getAIMove(aiState: AIState, board: BoardState, rng: RNG = createDefaultRNG()): Coordinate {
  switch (aiState.difficulty) {
    case DifficultyLevel.EASY:
      return getEasyMove(aiState, rng)
    case DifficultyLevel.MEDIUM:
      return getMediumMove(aiState, rng)
    case DifficultyLevel.HARD:
      return getHardMove(aiState, board)
  }
}

export function updateAIStateAfterResult(
  aiState: AIState,
  coord: Coordinate,
  result: 'HIT' | 'MISS' | 'SUNK'
): AIState {
  const idx = coord.row * GRID_SIZE + coord.col
  const withHistory: AIState = {
    ...aiState,
    shotHistory: new Set([...aiState.shotHistory, idx]),
  }

  switch (aiState.difficulty) {
    case DifficultyLevel.EASY:
      return withHistory
    case DifficultyLevel.MEDIUM:
      if (result === 'HIT') return updateMediumStateAfterHit(withHistory, coord)
      if (result === 'SUNK') return updateMediumStateAfterSunk(withHistory)
      return updateMediumStateAfterMiss(withHistory)
    case DifficultyLevel.HARD:
      if (result === 'HIT') return updateHardStateAfterHit(withHistory, coord)
      if (result === 'SUNK') return updateHardStateAfterSunk(withHistory)
      return updateHardStateAfterMiss(withHistory)
  }
}
