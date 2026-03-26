import { CellState } from '@/constants/game'
import { BoardState, Coordinate, ShotRecord } from '@/models/types'
import { toIndex } from '@/utils/coordinates'
import { getShipCells } from '@/logic/shipPlacement'

export type ShotResult = { type: 'HIT'; shipId: string } | { type: 'MISS' } | { type: 'SUNK'; shipId: string }

export function fireShot(board: BoardState, coord: Coordinate): { board: BoardState; result: ShotResult } {
  const idx = toIndex(coord)
  const cell = board.grid[idx]

  if (!cell || cell.state === CellState.HIT || cell.state === CellState.MISS || cell.state === CellState.SUNK) {
    return { board, result: { type: 'MISS' } }
  }

  const newGrid = board.grid.map((c, i) => (i === idx ? { ...c } : c))
  const newShips = board.ships.map((s) => ({ ...s, hits: new Set(s.hits) }))

  if (cell.state === CellState.SHIP && cell.shipId !== null) {
    const shipIdx = newShips.findIndex((s) => s.definition.id === cell.shipId)
    if (shipIdx === -1) return { board, result: { type: 'MISS' } }

    const ship = newShips[shipIdx]!
    ship.hits.add(cell.shipSegment ?? 0)

    if (ship.hits.size === ship.definition.size) {
      ship.isSunk = true
      // Mark all ship cells as SUNK
      const cells = getShipCells(ship.origin, ship.definition.size, ship.orientation)
      for (const c of cells) {
        newGrid[toIndex(c)] = { ...newGrid[toIndex(c)]!, state: CellState.SUNK }
      }
      return {
        board: { grid: newGrid, ships: newShips },
        result: { type: 'SUNK', shipId: ship.definition.id },
      }
    }

    newGrid[idx] = { ...newGrid[idx]!, state: CellState.HIT }
    return {
      board: { grid: newGrid, ships: newShips },
      result: { type: 'HIT', shipId: cell.shipId },
    }
  }

  newGrid[idx] = { ...newGrid[idx]!, state: CellState.MISS }
  return { board: { grid: newGrid, ships: newShips }, result: { type: 'MISS' } }
}

export function checkWin(board: BoardState): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.isSunk)
}

export function toShotRecord(
  by: 'PLAYER' | 'AI',
  coord: Coordinate,
  result: ShotResult
): ShotRecord {
  if (result.type === 'SUNK') {
    return { by, coord, result: 'SUNK', shipId: result.shipId }
  }
  if (result.type === 'HIT') {
    return { by, coord, result: 'HIT', shipId: result.shipId }
  }
  return { by, coord, result: 'MISS' }
}
