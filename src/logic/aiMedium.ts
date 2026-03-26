import { GRID_SIZE, DIRECTIONS } from '@/constants/grid'
import { AIState, Coordinate } from '@/models/types'
import { toIndex, fromIndex, isInBounds } from '@/utils/coordinates'
import { RNG, createDefaultRNG, randomElement } from '@/utils/random'

function getAdjacentCells(coord: Coordinate, shotHistory: Set<number>): Coordinate[] {
  return DIRECTIONS.map((d) => ({ row: coord.row + d.row, col: coord.col + d.col })).filter(
    (c) => isInBounds(c) && !shotHistory.has(toIndex(c))
  )
}

function inferAxisCells(streak: Coordinate[], shotHistory: Set<number>): Coordinate[] {
  if (streak.length < 2) return []
  const isHorizontal = streak[0]!.row === streak[1]!.row
  const sorted = [...streak].sort((a, b) => (isHorizontal ? a.col - b.col : a.row - b.row))
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const candidates: Coordinate[] = []

  if (isHorizontal) {
    const before = { row: first.row, col: first.col - 1 }
    const after = { row: last.row, col: last.col + 1 }
    if (isInBounds(before) && !shotHistory.has(toIndex(before))) candidates.push(before)
    if (isInBounds(after) && !shotHistory.has(toIndex(after))) candidates.push(after)
  } else {
    const before = { row: first.row - 1, col: first.col }
    const after = { row: last.row + 1, col: last.col }
    if (isInBounds(before) && !shotHistory.has(toIndex(before))) candidates.push(before)
    if (isInBounds(after) && !shotHistory.has(toIndex(after))) candidates.push(after)
  }
  return candidates
}

export function getMediumMove(aiState: AIState, rng: RNG = createDefaultRNG()): Coordinate {
  if (aiState.huntMode || aiState.targetQueue.length === 0) {
    // Hunt mode: random shot
    const all = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)
    const candidates = all.filter((i) => !aiState.shotHistory.has(i))
    return fromIndex(randomElement(candidates, rng))
  }

  // Target mode: use the queue
  if (aiState.hitStreak.length >= 2) {
    const axisCells = inferAxisCells(aiState.hitStreak, aiState.shotHistory)
    if (axisCells.length > 0) {
      return randomElement(axisCells, rng)
    }
  }

  return aiState.targetQueue[0]!
}

export function updateMediumStateAfterHit(aiState: AIState, coord: Coordinate): AIState {
  const adjacent = getAdjacentCells(coord, aiState.shotHistory)
  const newQueue = [...adjacent, ...aiState.targetQueue.slice(1)]
  const newStreak = [...aiState.hitStreak, coord]

  return {
    ...aiState,
    huntMode: false,
    targetQueue: newQueue,
    lastHit: coord,
    hitStreak: newStreak,
  }
}

export function updateMediumStateAfterMiss(aiState: AIState): AIState {
  const newQueue = aiState.targetQueue.slice(1)
  return {
    ...aiState,
    huntMode: newQueue.length === 0,
    targetQueue: newQueue,
  }
}

export function updateMediumStateAfterSunk(aiState: AIState): AIState {
  return {
    ...aiState,
    huntMode: true,
    targetQueue: [],
    lastHit: null,
    hitStreak: [],
  }
}
