import { describe, it, expect } from 'vitest'
import { DifficultyLevel, Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { createEmptyBoard, placeShip } from '@/logic/shipPlacement'
import { fireShot, checkWin } from '@/logic/gameEngine'
import { createInitialAIState, getAIMove, updateAIStateAfterResult } from '@/logic/aiFactory'
import { createSeededRNG } from '@/utils/random'
import { toIndex } from '@/utils/coordinates'

const destroyer = SHIP_DEFINITIONS[4]! // size 2

describe('aiMedium', () => {
  it('after a hit, next shot is adjacent to the hit', () => {
    const rng = createSeededRNG(42)
    let aiState = createInitialAIState(DifficultyLevel.MEDIUM)

    // Force first move to hit destroyer at (0,0)
    // We simulate the AI firing at (0,0) manually
    const hitCoord = { row: 0, col: 0 }
    aiState = { ...aiState, shotHistory: new Set([toIndex(hitCoord)]) }
    aiState = updateAIStateAfterResult(aiState, hitCoord, 'HIT')

    const nextMove = getAIMove(aiState, createEmptyBoard(), rng)

    // Next move must be adjacent to (0,0): either (0,1) or (1,0)
    const isAdjacent =
      (nextMove.row === 0 && nextMove.col === 1) ||
      (nextMove.row === 1 && nextMove.col === 0)
    expect(isAdjacent).toBe(true)
  })

  it('sinks a destroyer (size 2) within 4 shots after first hit is given', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 3, col: 3 }, Orientation.HORIZONTAL)

    // Pre-seed AI with the first hit at (3,3)
    const firstHit = { row: 3, col: 3 }
    const { board: hitBoard, result: firstResult } = fireShot(board, firstHit)
    board = hitBoard
    expect(firstResult.type).toBe('HIT')

    let aiState = createInitialAIState(DifficultyLevel.MEDIUM)
    aiState = { ...aiState, shotHistory: new Set([toIndex(firstHit)]) }
    aiState = updateAIStateAfterResult(aiState, firstHit, 'HIT')

    const rng = createSeededRNG(99)
    let shots = 0

    while (!checkWin(board) && shots < 4) {
      const coord = getAIMove(aiState, board, rng)
      const { board: newBoard, result } = fireShot(board, coord)
      board = newBoard
      const idx = toIndex(coord)
      aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, idx]) }
      aiState = updateAIStateAfterResult(aiState, coord, result.type)
      shots++
    }

    expect(checkWin(board)).toBe(true)
    expect(shots).toBeLessThanOrEqual(4)
  })

  it('returns to hunt mode after sinking a ship', () => {
    let aiState = createInitialAIState(DifficultyLevel.MEDIUM)
    const hitCoord = { row: 5, col: 5 }
    aiState = { ...aiState, shotHistory: new Set([toIndex(hitCoord)]) }
    aiState = updateAIStateAfterResult(aiState, hitCoord, 'HIT')
    expect(aiState.huntMode).toBe(false)

    const sunkCoord = { row: 5, col: 6 }
    aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, toIndex(sunkCoord)]) }
    aiState = updateAIStateAfterResult(aiState, sunkCoord, 'SUNK')
    expect(aiState.huntMode).toBe(true)
    expect(aiState.hitStreak).toHaveLength(0)
    expect(aiState.targetQueue).toHaveLength(0)
  })
})
