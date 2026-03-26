import { CellState, DifficultyLevel, GamePhase, Orientation } from '@/constants/game'
import { ShipDefinition } from '@/constants/ships'

export interface Coordinate {
  row: number
  col: number
}

export interface PlacedShip {
  definition: ShipDefinition
  origin: Coordinate
  orientation: Orientation
  hits: Set<number>
  isSunk: boolean
}

export interface GridCell {
  state: CellState
  shipId: string | null
  shipSegment: number | null
}

export type Grid = GridCell[]

export interface BoardState {
  grid: Grid
  ships: PlacedShip[]
}

export interface ShotRecord {
  by: 'PLAYER' | 'AI'
  coord: Coordinate
  result: 'HIT' | 'MISS' | 'SUNK'
  shipId?: string
}

export interface GameStats {
  playerShots: number
  aiShots: number
  playerHits: number
  aiHits: number
  startTime: number
  endTime: number | null
}

export interface AIState {
  difficulty: DifficultyLevel
  huntMode: boolean
  targetQueue: Coordinate[]
  lastHit: Coordinate | null
  hitStreak: Coordinate[]
  probabilityMap: number[]
  shotHistory: Set<number>
}

export interface GameState {
  phase: GamePhase
  difficulty: DifficultyLevel
  playerName: string
  playerBoard: BoardState
  opponentBoard: BoardState
  currentTurn: 'PLAYER' | 'AI'
  shotLog: ShotRecord[]
  aiState: AIState
  winner: 'PLAYER' | 'AI' | null
  stats: GameStats
}

export interface SavedGameState {
  version: number
  phase: GamePhase
  difficulty: DifficultyLevel
  playerBoard: {
    grid: { state: CellState; shipId: string | null; shipSegment: number | null }[]
    ships: {
      definition: ShipDefinition
      origin: Coordinate
      orientation: Orientation
      hits: number[]
      isSunk: boolean
    }[]
  }
  opponentBoard: {
    grid: { state: CellState; shipId: string | null; shipSegment: number | null }[]
    ships: {
      definition: ShipDefinition
      origin: Coordinate
      orientation: Orientation
      hits: number[]
      isSunk: boolean
    }[]
  }
  shotLog: ShotRecord[]
  stats: GameStats
}
