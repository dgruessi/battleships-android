import { describe, it, expect } from 'vitest'
import { DifficultyLevel, Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { GRID_SIZE } from '@/constants/grid'
import { createEmptyBoard, placeShip, autoPlace } from '@/logic/shipPlacement'
import { fireShot, checkWin } from '@/logic/gameEngine'
import { createInitialAIState, getAIMove, updateAIStateAfterResult } from '@/logic/aiFactory'
import { buildProbabilityMap } from '@/logic/aiHard'
import { toIndex } from '@/utils/coordinates'
import { createSeededRNG } from '@/utils/random'

const destroyer = SHIP_DEFINITIONS[4]!

describe('aiHard — buildProbabilityMap', () => {
  it('sums to a positive number on a fresh board', () => {
    const board = createEmptyBoard()
    const aiState = createInitialAIState(DifficultyLevel.HARD)
    const map = buildProbabilityMap(board, aiState)
    const total = map.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('zeros out already-fired cells', () => {
    const board = createEmptyBoard()
    let aiState = createInitialAIState(DifficultyLevel.HARD)
    aiState = { ...aiState, shotHistory: new Set([0, 1, 2]) }
    const map = buildProbabilityMap(board, aiState)
    expect(map[0]).toBe(0)
    expect(map[1]).toBe(0)
    expect(map[2]).toBe(0)
  })

  it('map length equals grid size squared', () => {
    const board = createEmptyBoard()
    const aiState = createInitialAIState(DifficultyLevel.HARD)
    const map = buildProbabilityMap(board, aiState)
    expect(map.length).toBe(GRID_SIZE * GRID_SIZE)
  })
})

describe('aiHard — getHardMove', () => {
  it('after a hit, next move is adjacent to the hit cell', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 5, col: 5 }, Orientation.HORIZONTAL)

    let aiState = createInitialAIState(DifficultyLevel.HARD)
    const hitCoord = { row: 5, col: 5 }
    aiState = { ...aiState, shotHistory: new Set([toIndex(hitCoord)]) }
    aiState = updateAIStateAfterResult(aiState, hitCoord, 'HIT')

    const nextMove = getAIMove(aiState, board)
    const isAdjacent =
      (Math.abs(nextMove.row - hitCoord.row) === 1 && nextMove.col === hitCoord.col) ||
      (Math.abs(nextMove.col - hitCoord.col) === 1 && nextMove.row === hitCoord.row)
    expect(isAdjacent).toBe(true)
  })

  it('sinks destroyer within 3 shots after first hit is given', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 4, col: 4 }, Orientation.HORIZONTAL)

    // Pre-seed AI with first hit at (4,4)
    const firstHit = { row: 4, col: 4 }
    const { board: hitBoard, result: firstResult } = fireShot(board, firstHit)
    board = hitBoard
    expect(firstResult.type).toBe('HIT')

    let aiState = createInitialAIState(DifficultyLevel.HARD)
    aiState = { ...aiState, shotHistory: new Set([toIndex(firstHit)]) }
    aiState = updateAIStateAfterResult(aiState, firstHit, 'HIT')

    let shots = 0
    while (!checkWin(board) && shots < 5) {
      const coord = getAIMove(aiState, board)
      const { board: nb, result } = fireShot(board, coord)
      board = nb
      aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, toIndex(coord)]) }
      aiState = updateAIStateAfterResult(aiState, coord, result.type)
      shots++
    }

    expect(checkWin(board)).toBe(true)
    expect(shots).toBeLessThanOrEqual(5)
  })

  it('never fires duplicate shots over a full game', () => {
    let board = autoPlace(createSeededRNG(5))
    let aiState = createInitialAIState(DifficultyLevel.HARD)
    const fired = new Set<number>()
    let shots = 0

    while (!checkWin(board) && shots < 100) {
      const coord = getAIMove(aiState, board)
      const idx = toIndex(coord)
      expect(fired.has(idx)).toBe(false)
      fired.add(idx)
      const { board: nb, result } = fireShot(board, coord)
      board = nb
      aiState = { ...aiState, shotHistory: new Set([...aiState.shotHistory, idx]) }
      aiState = updateAIStateAfterResult(aiState, coord, result.type)
      shots++
    }
  })
})
