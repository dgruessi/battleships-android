import { create } from 'zustand'
import { DifficultyLevel, GamePhase } from '@/constants/game'
import { SHIP_DEFINITIONS, ShipDefinition } from '@/constants/ships'
import { AIState, Coordinate, GameState, GameStats, ShotRecord } from '@/models/types'
import { Orientation } from '@/constants/game'
import { createEmptyBoard, placeShip, removeShip, autoPlace, allShipsPlaced } from '@/logic/shipPlacement'
import { fireShot, checkWin, toShotRecord } from '@/logic/gameEngine'
import { createInitialAIState, getAIMove, updateAIStateAfterResult } from '@/logic/aiFactory'
import { toIndex } from '@/utils/coordinates'
import { randomInt } from '@/utils/random'

function createInitialStats(): GameStats {
  return {
    playerShots: 0,
    aiShots: 0,
    playerHits: 0,
    aiHits: 0,
    startTime: 0,
    endTime: null,
  }
}

function serializeAIState(aiState: AIState): AIState {
  return {
    ...aiState,
    shotHistory: new Set(aiState.shotHistory),
  }
}

export interface GameStore extends GameState {
  // Setup
  setDifficulty: (difficulty: DifficultyLevel) => void
  setPlayerName: (name: string) => void
  startPlacement: () => void

  // Placement
  placeShipOnBoard: (definition: ShipDefinition, coord: Coordinate, orientation: Orientation) => void
  removeShipFromBoard: (shipId: string) => void
  autoPlaceAll: () => void
  clearPlacements: () => void
  startBattle: () => void

  // Battle
  playerFire: (coord: Coordinate) => void
  triggerAITurn: () => void

  // Meta
  resetGame: () => void

  // Computed
  isPlayerTurn: () => boolean
  isGameOver: () => boolean
}

const initialState: GameState = {
  phase: GamePhase.SETUP,
  difficulty: DifficultyLevel.EASY,
  playerName: 'Admiral',
  playerBoard: createEmptyBoard(),
  opponentBoard: createEmptyBoard(),
  currentTurn: 'PLAYER',
  shotLog: [],
  aiState: createInitialAIState(DifficultyLevel.EASY),
  winner: null,
  stats: createInitialStats(),
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setDifficulty: (difficulty) => {
    set({ difficulty, aiState: createInitialAIState(difficulty) })
  },

  setPlayerName: (name) => {
    set({ playerName: name.trim() || 'Admiral' })
  },

  startPlacement: () => {
    set({
      phase: GamePhase.PLACEMENT,
      playerBoard: createEmptyBoard(),
      opponentBoard: createEmptyBoard(),
      shotLog: [],
      winner: null,
      stats: createInitialStats(),
    })
  },

  placeShipOnBoard: (definition, coord, orientation) => {
    const { playerBoard } = get()
    const newBoard = placeShip(playerBoard, definition, coord, orientation)
    set({ playerBoard: newBoard })
  },

  removeShipFromBoard: (shipId) => {
    const { playerBoard } = get()
    set({ playerBoard: removeShip(playerBoard, shipId) })
  },

  autoPlaceAll: () => {
    const newBoard = autoPlace()
    set({ playerBoard: newBoard })
  },

  clearPlacements: () => {
    set({ playerBoard: createEmptyBoard() })
  },

  startBattle: () => {
    const { playerBoard, difficulty } = get()
    if (!allShipsPlaced(playerBoard)) return

    const opponentBoard = autoPlace()
    const aiState = createInitialAIState(difficulty)

    set({
      phase: GamePhase.BATTLE,
      opponentBoard,
      aiState,
      currentTurn: 'PLAYER',
      shotLog: [],
      winner: null,
      stats: { ...createInitialStats(), startTime: Date.now() },
    })
  },

  playerFire: (coord) => {
    const { opponentBoard, shotLog, stats, currentTurn, phase } = get()
    if (phase !== GamePhase.BATTLE || currentTurn !== 'PLAYER') return

    const idx = toIndex(coord)
    const cell = opponentBoard.grid[idx]
    if (!cell || cell.state === 'HIT' || cell.state === 'MISS' || cell.state === 'SUNK') return

    const { board: newBoard, result } = fireShot(opponentBoard, coord)
    const record = toShotRecord('PLAYER', coord, result)
    const newLog: ShotRecord[] = [...shotLog, record]
    const newStats: GameStats = {
      ...stats,
      playerShots: stats.playerShots + 1,
      playerHits: stats.playerHits + (result.type !== 'MISS' ? 1 : 0),
    }

    if (checkWin(newBoard)) {
      set({
        opponentBoard: newBoard,
        shotLog: newLog,
        stats: { ...newStats, endTime: Date.now() },
        winner: 'PLAYER',
        phase: GamePhase.RESULTS,
        currentTurn: 'PLAYER',
      })
      return
    }

    set({
      opponentBoard: newBoard,
      shotLog: newLog,
      stats: newStats,
      currentTurn: 'AI',
    })
  },

  triggerAITurn: () => {
    const { playerBoard, aiState, shotLog, stats, currentTurn, phase } = get()
    if (phase !== GamePhase.BATTLE || currentTurn !== 'AI') return

    const coord = getAIMove(aiState, playerBoard)
    const { board: newPlayerBoard, result } = fireShot(playerBoard, coord)
    const idx = toIndex(coord)

    const newAIState: AIState = serializeAIState(
      updateAIStateAfterResult(
        { ...aiState, shotHistory: new Set([...aiState.shotHistory, idx]) },
        coord,
        result.type
      )
    )

    const record = toShotRecord('AI', coord, result)
    const newLog: ShotRecord[] = [...shotLog, record]
    const newStats: GameStats = {
      ...stats,
      aiShots: stats.aiShots + 1,
      aiHits: stats.aiHits + (result.type !== 'MISS' ? 1 : 0),
    }

    if (checkWin(newPlayerBoard)) {
      set({
        playerBoard: newPlayerBoard,
        aiState: newAIState,
        shotLog: newLog,
        stats: { ...newStats, endTime: Date.now() },
        winner: 'AI',
        phase: GamePhase.RESULTS,
        currentTurn: 'AI',
      })
      return
    }

    set({
      playerBoard: newPlayerBoard,
      aiState: newAIState,
      shotLog: newLog,
      stats: newStats,
      currentTurn: 'PLAYER',
    })
  },

  resetGame: () => {
    const { difficulty } = get()
    set({
      ...initialState,
      difficulty,
      aiState: createInitialAIState(difficulty),
    })
  },

  isPlayerTurn: () => get().currentTurn === 'PLAYER' && get().phase === GamePhase.BATTLE,
  isGameOver: () => get().phase === GamePhase.RESULTS,
}))

// AI turn delay helper — used by BattlePhase component
export const AI_TURN_DELAY_MS = () => randomInt(800, 1400)

// Expose SHIP_DEFINITIONS for placement phase
export { SHIP_DEFINITIONS }
