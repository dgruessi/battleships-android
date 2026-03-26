import { describe, it, expect } from 'vitest'
import { Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { createEmptyBoard, placeShip } from '@/logic/shipPlacement'
import { fireShot, checkWin, toShotRecord } from '@/logic/gameEngine'

const destroyer = SHIP_DEFINITIONS[4]! // size 2

function boardWithDestroyer() {
  let board = createEmptyBoard()
  board = placeShip(board, destroyer, { row: 0, col: 0 }, Orientation.HORIZONTAL)
  return board
}

describe('fireShot', () => {
  it('returns MISS on empty cell', () => {
    const board = createEmptyBoard()
    const { result } = fireShot(board, { row: 5, col: 5 })
    expect(result.type).toBe('MISS')
  })
  it('returns HIT on ship cell (not sunk)', () => {
    const board = boardWithDestroyer()
    const { result } = fireShot(board, { row: 0, col: 0 })
    expect(result.type).toBe('HIT')
    if (result.type === 'HIT') expect(result.shipId).toBe('destroyer')
  })
  it('returns SUNK when last cell of ship is hit', () => {
    let board = boardWithDestroyer()
    ;({ board } = fireShot(board, { row: 0, col: 0 }))
    const { result } = fireShot(board, { row: 0, col: 1 })
    expect(result.type).toBe('SUNK')
  })
  it('marks MISS cell on grid', () => {
    const board = createEmptyBoard()
    const { board: newBoard } = fireShot(board, { row: 3, col: 3 })
    expect(newBoard.grid[33]!.state).toBe('MISS')
  })
  it('marks HIT cell on grid', () => {
    const board = boardWithDestroyer()
    const { board: newBoard } = fireShot(board, { row: 0, col: 0 })
    expect(newBoard.grid[0]!.state).toBe('HIT')
  })
  it('marks all ship cells as SUNK when ship is sunk', () => {
    let board = boardWithDestroyer()
    ;({ board } = fireShot(board, { row: 0, col: 0 }))
    ;({ board } = fireShot(board, { row: 0, col: 1 }))
    expect(board.grid[0]!.state).toBe('SUNK')
    expect(board.grid[1]!.state).toBe('SUNK')
  })
  it('is idempotent on already-fired cell (returns MISS)', () => {
    let board = createEmptyBoard()
    ;({ board } = fireShot(board, { row: 0, col: 0 }))
    const { result } = fireShot(board, { row: 0, col: 0 })
    expect(result.type).toBe('MISS')
  })
})

describe('checkWin', () => {
  it('false on empty board', () => expect(checkWin(createEmptyBoard())).toBe(false))
  it('false when ships remain afloat', () => {
    const board = boardWithDestroyer()
    expect(checkWin(board)).toBe(false)
  })
  it('true when all ships sunk', () => {
    let board = boardWithDestroyer()
    ;({ board } = fireShot(board, { row: 0, col: 0 }))
    ;({ board } = fireShot(board, { row: 0, col: 1 }))
    expect(checkWin(board)).toBe(true)
  })
  it('false when one of two ships still afloat', () => {
    const cruiser = SHIP_DEFINITIONS[2]!
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    board = placeShip(board, cruiser, { row: 2, col: 0 }, Orientation.HORIZONTAL)
    ;({ board } = fireShot(board, { row: 0, col: 0 }))
    ;({ board } = fireShot(board, { row: 0, col: 1 }))
    expect(checkWin(board)).toBe(false)
  })
})

describe('toShotRecord', () => {
  it('maps HIT result correctly', () => {
    const r = toShotRecord('PLAYER', { row: 0, col: 0 }, { type: 'HIT', shipId: 'destroyer' })
    expect(r).toEqual({ by: 'PLAYER', coord: { row: 0, col: 0 }, result: 'HIT', shipId: 'destroyer' })
  })
  it('maps MISS result correctly', () => {
    const r = toShotRecord('AI', { row: 1, col: 1 }, { type: 'MISS' })
    expect(r).toEqual({ by: 'AI', coord: { row: 1, col: 1 }, result: 'MISS' })
  })
  it('maps SUNK result correctly', () => {
    const r = toShotRecord('PLAYER', { row: 0, col: 1 }, { type: 'SUNK', shipId: 'destroyer' })
    expect(r).toEqual({ by: 'PLAYER', coord: { row: 0, col: 1 }, result: 'SUNK', shipId: 'destroyer' })
  })
})
