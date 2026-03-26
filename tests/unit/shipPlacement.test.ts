import { describe, it, expect } from 'vitest'
import { Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { createEmptyBoard, isValidPlacement, placeShip, removeShip, autoPlace, allShipsPlaced, getShipCells } from '@/logic/shipPlacement'
import { createSeededRNG } from '@/utils/random'

const carrier = SHIP_DEFINITIONS[0]! // size 5
const destroyer = SHIP_DEFINITIONS[4]! // size 2

describe('getShipCells', () => {
  it('horizontal: starts at origin, extends right', () => {
    const cells = getShipCells({ row: 0, col: 0 }, 3, Orientation.HORIZONTAL)
    expect(cells).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }])
  })
  it('vertical: starts at origin, extends down', () => {
    const cells = getShipCells({ row: 0, col: 0 }, 3, Orientation.VERTICAL)
    expect(cells).toEqual([{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }])
  })
})

describe('isValidPlacement', () => {
  it('accepts valid horizontal placement', () => {
    const board = createEmptyBoard()
    expect(isValidPlacement(board.grid, { row: 0, col: 0 }, 5, Orientation.HORIZONTAL)).toBe(true)
  })
  it('rejects placement out of right boundary', () => {
    const board = createEmptyBoard()
    expect(isValidPlacement(board.grid, { row: 0, col: 6 }, 5, Orientation.HORIZONTAL)).toBe(false)
  })
  it('rejects placement out of bottom boundary', () => {
    const board = createEmptyBoard()
    expect(isValidPlacement(board.grid, { row: 8, col: 0 }, 5, Orientation.VERTICAL)).toBe(false)
  })
  it('rejects overlapping ships', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    expect(isValidPlacement(board.grid, { row: 0, col: 0 }, 3, Orientation.HORIZONTAL)).toBe(false)
  })
  it('rejects placement directly adjacent to existing ship', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    expect(isValidPlacement(board.grid, { row: 1, col: 0 }, 3, Orientation.HORIZONTAL)).toBe(false)
  })

  it('accepts placement with one-cell gap from existing ship', () => {
    let board = createEmptyBoard()
    board = placeShip(board, destroyer, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    expect(isValidPlacement(board.grid, { row: 2, col: 0 }, 3, Orientation.HORIZONTAL)).toBe(true)
  })
})

describe('placeShip', () => {
  it('adds ship to board', () => {
    let board = createEmptyBoard()
    board = placeShip(board, carrier, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    expect(board.ships).toHaveLength(1)
    expect(board.ships[0]!.definition.id).toBe('carrier')
  })
  it('marks correct cells as SHIP', () => {
    let board = createEmptyBoard()
    board = placeShip(board, carrier, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    for (let c = 0; c < 5; c++) {
      expect(board.grid[c]!.state).toBe('SHIP')
      expect(board.grid[c]!.shipId).toBe('carrier')
    }
  })
  it('replaces existing ship with same id', () => {
    let board = createEmptyBoard()
    board = placeShip(board, carrier, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    board = placeShip(board, carrier, { row: 5, col: 0 }, Orientation.HORIZONTAL)
    expect(board.ships).toHaveLength(1)
    expect(board.ships[0]!.origin).toEqual({ row: 5, col: 0 })
  })
  it('does not place invalid ship', () => {
    const board = createEmptyBoard()
    const result = placeShip(board, carrier, { row: 0, col: 8 }, Orientation.HORIZONTAL)
    expect(result.ships).toHaveLength(0)
  })
})

describe('removeShip', () => {
  it('removes ship and clears cells', () => {
    let board = createEmptyBoard()
    board = placeShip(board, carrier, { row: 0, col: 0 }, Orientation.HORIZONTAL)
    board = removeShip(board, 'carrier')
    expect(board.ships).toHaveLength(0)
    expect(board.grid[0]!.state).toBe('EMPTY')
  })
})

describe('autoPlace', () => {
  it('places all 5 ships', () => {
    const board = autoPlace(createSeededRNG(42))
    expect(board.ships).toHaveLength(5)
  })
  it('produces non-overlapping placement', () => {
    const board = autoPlace(createSeededRNG(123))
    const occupied = new Set<number>()
    for (const ship of board.ships) {
      const cells = getShipCells(ship.origin, ship.definition.size, ship.orientation)
      for (const c of cells) {
        const idx = c.row * 10 + c.col
        expect(occupied.has(idx)).toBe(false)
        occupied.add(idx)
      }
    }
  })
  it('is deterministic with same seed', () => {
    const b1 = autoPlace(createSeededRNG(99))
    const b2 = autoPlace(createSeededRNG(99))
    expect(b1.ships.map((s) => s.origin)).toEqual(b2.ships.map((s) => s.origin))
  })
})

describe('allShipsPlaced', () => {
  it('false when no ships', () => expect(allShipsPlaced(createEmptyBoard())).toBe(false))
  it('true when all 5 placed', () => {
    const board = autoPlace(createSeededRNG(1))
    expect(allShipsPlaced(board)).toBe(true)
  })
})
