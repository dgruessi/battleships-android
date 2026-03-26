import { GRID_SIZE } from '@/constants/grid'
import { CellState, Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS, ShipDefinition } from '@/constants/ships'
import { BoardState, Coordinate, Grid, GridCell, PlacedShip } from '@/models/types'
import { toIndex, isInBounds } from '@/utils/coordinates'
import { shuffle, RNG, createDefaultRNG } from '@/utils/random'

export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({
    state: CellState.EMPTY,
    shipId: null,
    shipSegment: null,
  }))
}

export function createEmptyBoard(): BoardState {
  return { grid: createEmptyGrid(), ships: [] }
}

export function getShipCells(
  origin: Coordinate,
  size: number,
  orientation: Orientation
): Coordinate[] {
  const cells: Coordinate[] = []
  for (let i = 0; i < size; i++) {
    cells.push(
      orientation === Orientation.HORIZONTAL
        ? { row: origin.row, col: origin.col + i }
        : { row: origin.row + i, col: origin.col }
    )
  }
  return cells
}

export function isValidPlacement(
  grid: Grid,
  origin: Coordinate,
  size: number,
  orientation: Orientation,
  excludeShipId?: string
): boolean {
  const cells = getShipCells(origin, size, orientation)

  // Check that all ship cells are in bounds and not occupied by another ship
  for (const cell of cells) {
    if (!isInBounds(cell)) return false
    const existing = grid[toIndex(cell)]
    if (existing && existing.state === CellState.SHIP && existing.shipId !== excludeShipId) {
      return false
    }
  }

  // Check that no adjacent cell (including diagonals) belongs to another ship
  const shipCellSet = new Set(cells.map((c) => toIndex(c)))
  for (const cell of cells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const neighbor = { row: cell.row + dr, col: cell.col + dc }
        if (!isInBounds(neighbor)) continue
        const nIdx = toIndex(neighbor)
        if (shipCellSet.has(nIdx)) continue // same ship
        const existing = grid[nIdx]
        if (existing && existing.state === CellState.SHIP && existing.shipId !== excludeShipId) {
          return false
        }
      }
    }
  }

  return true
}

export function placeShip(
  board: BoardState,
  definition: ShipDefinition,
  origin: Coordinate,
  orientation: Orientation
): BoardState {
  if (!isValidPlacement(board.grid, origin, definition.size, orientation)) {
    return board
  }

  const newGrid: Grid = board.grid.map((cell: GridCell) => ({ ...cell }))
  const cells = getShipCells(origin, definition.size, orientation)

  cells.forEach((coord, i) => {
    newGrid[toIndex(coord)] = {
      state: CellState.SHIP,
      shipId: definition.id,
      shipSegment: i,
    }
  })

  const ship: PlacedShip = {
    definition,
    origin,
    orientation,
    hits: new Set(),
    isSunk: false,
  }

  return {
    grid: newGrid,
    ships: [...board.ships.filter((s) => s.definition.id !== definition.id), ship],
  }
}

export function removeShip(board: BoardState, shipId: string): BoardState {
  const newGrid: Grid = board.grid.map((cell: GridCell) =>
    cell.shipId === shipId
      ? { state: CellState.EMPTY, shipId: null, shipSegment: null }
      : { ...cell }
  )
  return {
    grid: newGrid,
    ships: board.ships.filter((s) => s.definition.id !== shipId),
  }
}

export function autoPlace(rng: RNG = createDefaultRNG()): BoardState {
  let board = createEmptyBoard()
  const shuffled = shuffle([...SHIP_DEFINITIONS], rng)

  for (const def of shuffled) {
    let placed = false
    const orientations = shuffle(
      [Orientation.HORIZONTAL, Orientation.VERTICAL],
      rng
    )
    const indices = shuffle(
      Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i),
      rng
    )

    outer: for (const orientation of orientations) {
      for (const idx of indices) {
        const origin = {
          row: Math.floor(idx / GRID_SIZE),
          col: idx % GRID_SIZE,
        }
        if (isValidPlacement(board.grid, origin, def.size, orientation)) {
          board = placeShip(board, def, origin, orientation)
          placed = true
          break outer
        }
      }
    }

    if (!placed) {
      // Fallback: reset and retry
      return autoPlace(rng)
    }
  }

  return board
}

export function allShipsPlaced(board: BoardState): boolean {
  return board.ships.length === SHIP_DEFINITIONS.length
}
