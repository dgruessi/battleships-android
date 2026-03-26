import { GRID_SIZE, DIRECTIONS } from '@/constants/grid'
import { CellState, Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { AIState, BoardState, Coordinate } from '@/models/types'
import { toIndex, isInBounds } from '@/utils/coordinates'
import { getShipCells } from '@/logic/shipPlacement'

export function buildProbabilityMap(board: BoardState, aiState: AIState): number[] {
  const map = new Array(GRID_SIZE * GRID_SIZE).fill(0) as number[]
  const remainingShips = board.ships.filter((s) => !s.isSunk)
  const remaining = remainingShips.length > 0
    ? remainingShips.map((s) => s.definition)
    : SHIP_DEFINITIONS

  for (const def of remaining) {
    for (const orientation of [Orientation.HORIZONTAL, Orientation.VERTICAL]) {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const origin: Coordinate = { row, col }
          const cells = getShipCells(origin, def.size, orientation)
          if (!cells.every((c) => isInBounds(c))) continue

          const valid = cells.every((c) => {
            const cell = board.grid[toIndex(c)]
            return cell && cell.state !== CellState.MISS && cell.state !== CellState.SUNK
          })

          if (valid) {
            for (const c of cells) {
              map[toIndex(c)]!++
            }
          }
        }
      }
    }
  }

  // Zero out already-fired and sunk cells
  for (const idx of aiState.shotHistory) {
    map[idx] = 0
  }

  return map
}

function getAdjacentUnfired(coord: Coordinate, shotHistory: Set<number>): Coordinate[] {
  return DIRECTIONS.map((d) => ({ row: coord.row + d.row, col: coord.col + d.col })).filter(
    (c) => isInBounds(c) && !shotHistory.has(toIndex(c))
  )
}

export function getHardMove(aiState: AIState, board: BoardState): Coordinate {
  const map = buildProbabilityMap(board, aiState)

  // If in target mode, bias strongly toward hit-adjacent cells
  if (!aiState.huntMode && aiState.hitStreak.length > 0) {
    const adjacentIndices = new Set<number>()
    for (const hit of aiState.hitStreak) {
      for (const adj of getAdjacentUnfired(hit, aiState.shotHistory)) {
        adjacentIndices.add(toIndex(adj))
      }
    }

    if (adjacentIndices.size > 0) {
      let bestIdx = -1
      let bestScore = -1
      for (const idx of adjacentIndices) {
        if ((map[idx] ?? 0) > bestScore) {
          bestScore = map[idx] ?? 0
          bestIdx = idx
        }
      }
      if (bestIdx >= 0) {
        return { row: Math.floor(bestIdx / GRID_SIZE), col: bestIdx % GRID_SIZE }
      }
    }
  }

  // Global argmax
  let bestIdx = 0
  let bestScore = -1
  for (let i = 0; i < map.length; i++) {
    if ((map[i] ?? 0) > bestScore) {
      bestScore = map[i] ?? 0
      bestIdx = i
    }
  }

  return { row: Math.floor(bestIdx / GRID_SIZE), col: bestIdx % GRID_SIZE }
}

export function updateHardStateAfterHit(aiState: AIState, coord: Coordinate): AIState {
  return {
    ...aiState,
    huntMode: false,
    lastHit: coord,
    hitStreak: [...aiState.hitStreak, coord],
  }
}

export function updateHardStateAfterMiss(aiState: AIState): AIState {
  return {
    ...aiState,
    huntMode: aiState.hitStreak.length === 0,
  }
}

export function updateHardStateAfterSunk(aiState: AIState): AIState {
  return {
    ...aiState,
    huntMode: true,
    lastHit: null,
    hitStreak: [],
    targetQueue: [],
  }
}
