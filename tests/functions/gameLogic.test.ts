import { describe, test, expect } from 'vitest'
import { processShot, type CellState } from '@functions/gameLogic'

const ALL_SHIPS = [
  { type: 'CARRIER',     row: 0, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'CRUISER',     row: 1, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'DESTROYER_A', row: 2, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'DESTROYER_B', row: 3, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'PATROL_BOAT', row: 4, col: 0, orientation: 'HORIZONTAL' as const },
]

function emptyBoard(): CellState[][] {
  return Array.from({ length: 10 }, () => Array<CellState>(10).fill('UNKNOWN'))
}

describe('processShot', () => {
  test('shot on empty water → MISS', () => {
    const result = processShot(9, 9, ALL_SHIPS, emptyBoard())
    expect(result.outcome).toBe('MISS')
    expect(result.isWinner).toBe(false)
    expect(result.updatedBoard[9][9]).toBe('EMPTY')
  })

  test('first hit on CARRIER → HIT not SUNK', () => {
    const result = processShot(0, 0, ALL_SHIPS, emptyBoard())
    expect(result.outcome).toBe('HIT')
    expect(result.isWinner).toBe(false)
    expect(result.updatedBoard[0][0]).toBe('HIT')
  })

  test('partial carrier hits → still HIT not SUNK', () => {
    const board = emptyBoard()
    board[0][0] = 'HIT'
    board[0][1] = 'HIT'
    board[0][2] = 'HIT'
    board[0][3] = 'HIT'
    const result = processShot(0, 4, ALL_SHIPS, board)
    // CARRIER has 5 cells — all 5 hit now → SUNK
    expect(result.outcome).toBe('SUNK')
    expect(result.sunkShipType).toBe('CARRIER')
  })

  test('hit 4 of 5 carrier cells → HIT not SUNK', () => {
    const board = emptyBoard()
    board[0][0] = 'HIT'
    board[0][1] = 'HIT'
    board[0][2] = 'HIT'
    const result = processShot(0, 3, ALL_SHIPS, board)
    expect(result.outcome).toBe('HIT')
    expect(result.isWinner).toBe(false)
  })

  test('sinking PATROL_BOAT → SUNK, all cells marked SUNK', () => {
    const board = emptyBoard()
    board[4][0] = 'HIT' // first cell already hit
    const result = processShot(4, 1, ALL_SHIPS, board)
    expect(result.outcome).toBe('SUNK')
    expect(result.sunkShipType).toBe('PATROL_BOAT')
    expect(result.updatedBoard[4][0]).toBe('SUNK')
    expect(result.updatedBoard[4][1]).toBe('SUNK')
    expect(result.isWinner).toBe(false) // 4 ships remain
  })

  test('sinking last remaining ship → isWinner true', () => {
    const board = emptyBoard()
    // Pre-mark everything sunk except last cell of PATROL_BOAT
    for (let c = 0; c < 5; c++) board[0][c] = 'SUNK' // CARRIER
    for (let c = 0; c < 4; c++) board[1][c] = 'SUNK' // CRUISER
    for (let c = 0; c < 3; c++) board[2][c] = 'SUNK' // DESTROYER_A
    for (let c = 0; c < 3; c++) board[3][c] = 'SUNK' // DESTROYER_B
    board[4][0] = 'HIT'                               // PATROL_BOAT first cell

    const result = processShot(4, 1, ALL_SHIPS, board)
    expect(result.outcome).toBe('SUNK')
    expect(result.isWinner).toBe(true)
  })

  test('original board is not mutated', () => {
    const board = emptyBoard()
    processShot(0, 0, ALL_SHIPS, board)
    expect(board[0][0]).toBe('UNKNOWN')
  })

  test('MISS does not mutate ship cells', () => {
    const board = emptyBoard()
    board[0][0] = 'HIT'
    const result = processShot(9, 9, ALL_SHIPS, board)
    expect(result.outcome).toBe('MISS')
    expect(result.updatedBoard[0][0]).toBe('HIT') // unchanged
  })

  test('vertical ship is hit correctly', () => {
    const verticalFleet = [
      { type: 'CARRIER',     row: 0, col: 0, orientation: 'VERTICAL' as const },
      { type: 'CRUISER',     row: 0, col: 1, orientation: 'VERTICAL' as const },
      { type: 'DESTROYER_A', row: 0, col: 2, orientation: 'VERTICAL' as const },
      { type: 'DESTROYER_B', row: 0, col: 3, orientation: 'VERTICAL' as const },
      { type: 'PATROL_BOAT', row: 0, col: 4, orientation: 'VERTICAL' as const },
    ]
    const result = processShot(3, 0, verticalFleet, emptyBoard()) // row 3, col 0 = CARRIER cell 4
    expect(result.outcome).toBe('HIT')
    expect(result.updatedBoard[3][0]).toBe('HIT')
  })
})
