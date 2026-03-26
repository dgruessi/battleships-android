import { GRID_SIZE } from '@/constants/grid'
import { Coordinate } from '@/models/types'

export function toIndex(coord: Coordinate): number {
  return coord.row * GRID_SIZE + coord.col
}

export function fromIndex(index: number): Coordinate {
  return {
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE,
  }
}

export function toAlgebraic(coord: Coordinate): string {
  const colLabel = String.fromCharCode(65 + coord.col)
  return `${colLabel}${coord.row + 1}`
}

export function parseAlgebraic(s: string): Coordinate {
  const col = s.charCodeAt(0) - 65
  const row = parseInt(s.slice(1), 10) - 1
  return { row, col }
}

export function isInBounds(coord: Coordinate): boolean {
  return coord.row >= 0 && coord.row < GRID_SIZE && coord.col >= 0 && coord.col < GRID_SIZE
}

export function coordsEqual(a: Coordinate, b: Coordinate): boolean {
  return a.row === b.row && a.col === b.col
}
