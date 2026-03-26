import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { GamePhase, DifficultyLevel, Orientation } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { useGameStore } from '@/store/gameStore'
import { allShipsPlaced } from '@/logic/shipPlacement'

// Reset store before each test
beforeEach(() => {
  useGameStore.getState().resetGame()
  useGameStore.getState().setDifficulty(DifficultyLevel.EASY)
})

describe('gameStore — setup & placement transitions', () => {
  it('starts in SETUP phase', () => {
    const { result } = renderHook(() => useGameStore())
    expect(result.current.phase).toBe(GamePhase.SETUP)
  })

  it('transitions to PLACEMENT on startPlacement()', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    expect(result.current.phase).toBe(GamePhase.PLACEMENT)
  })

  it('startBattle() does nothing if ships not placed', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    act(() => result.current.startBattle())
    expect(result.current.phase).toBe(GamePhase.PLACEMENT)
  })

  it('startBattle() transitions to BATTLE when all ships placed', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    act(() => result.current.autoPlaceAll())
    expect(allShipsPlaced(result.current.playerBoard)).toBe(true)
    act(() => result.current.startBattle())
    expect(result.current.phase).toBe(GamePhase.BATTLE)
  })

  it('autoPlaceAll places all 5 ships', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    act(() => result.current.autoPlaceAll())
    expect(result.current.playerBoard.ships).toHaveLength(5)
  })

  it('clearPlacements removes all ships', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    act(() => result.current.autoPlaceAll())
    act(() => result.current.clearPlacements())
    expect(result.current.playerBoard.ships).toHaveLength(0)
  })

  it('placeShipOnBoard places a ship at the given position', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.startPlacement())
    act(() =>
      result.current.placeShipOnBoard(
        SHIP_DEFINITIONS[4]!,
        { row: 0, col: 0 },
        Orientation.HORIZONTAL
      )
    )
    expect(result.current.playerBoard.ships).toHaveLength(1)
    expect(result.current.playerBoard.ships[0]!.definition.id).toBe('destroyer')
  })

  it('setDifficulty updates difficulty and resets aiState', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.setDifficulty(DifficultyLevel.HARD))
    expect(result.current.difficulty).toBe(DifficultyLevel.HARD)
    expect(result.current.aiState.difficulty).toBe(DifficultyLevel.HARD)
  })
})

describe('gameStore — battle phase', () => {
  function setupBattle() {
    const store = useGameStore.getState()
    store.startPlacement()
    store.autoPlaceAll()
    store.startBattle()
  }

  it('playerFire records a shot in the log', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    const coord = { row: 0, col: 0 }
    act(() => result.current.playerFire(coord))
    expect(result.current.shotLog).toHaveLength(1)
    expect(result.current.shotLog[0]!.by).toBe('PLAYER')
    expect(result.current.shotLog[0]!.coord).toEqual(coord)
  })

  it('playerFire increments playerShots stat', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.playerFire({ row: 0, col: 0 }))
    expect(result.current.stats.playerShots).toBe(1)
  })

  it('playerFire switches turn to AI', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.playerFire({ row: 0, col: 0 }))
    expect(result.current.currentTurn).toBe('AI')
  })

  it('playerFire on already-fired cell does not add to log', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.playerFire({ row: 0, col: 0 }))
    const logLengthAfterFirst = result.current.shotLog.length
    // Re-fire same cell — should be blocked
    // Reset turn to PLAYER manually for test isolation
    act(() => {
      useGameStore.setState({ currentTurn: 'PLAYER' })
    })
    act(() => result.current.playerFire({ row: 0, col: 0 }))
    expect(result.current.shotLog.length).toBe(logLengthAfterFirst)
  })

  it('triggerAITurn fires on player board and switches turn to PLAYER', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.playerFire({ row: 0, col: 0 }))
    expect(result.current.currentTurn).toBe('AI')
    act(() => result.current.triggerAITurn())
    expect(result.current.shotLog).toHaveLength(2)
    expect(result.current.shotLog[1]!.by).toBe('AI')
    expect(result.current.currentTurn).toBe('PLAYER')
  })

  it('resetGame resets to SETUP phase', () => {
    setupBattle()
    const { result } = renderHook(() => useGameStore())
    act(() => result.current.resetGame())
    expect(result.current.phase).toBe(GamePhase.SETUP)
    expect(result.current.shotLog).toHaveLength(0)
    expect(result.current.winner).toBeNull()
  })
})
