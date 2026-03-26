import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import BattlePhase from '@/components/phases/BattlePhase'

// Speed up AI delay for tests
vi.mock('@/store/gameStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/gameStore')>()
  return { ...actual, AI_TURN_DELAY_MS: () => 50 }
})

function setupBattle() {
  const store = useGameStore.getState()
  store.resetGame()
  store.startPlacement()
  store.autoPlaceAll()
  store.startBattle()
}

beforeEach(() => { setupBattle() })

describe('BattlePhase', () => {
  it('renders both grids', () => {
    render(<BattlePhase />)
    expect(screen.getByTestId('opponent-board')).toBeInTheDocument()
    expect(screen.getByTestId('player-board')).toBeInTheDocument()
  })

  it('renders health bars', () => {
    render(<BattlePhase />)
    expect(screen.getByTestId('health-enemy')).toBeInTheDocument()
    expect(screen.getByTestId('health-you')).toBeInTheDocument()
  })

  it('clicking a cell on the attack grid records a shot', async () => {
    render(<BattlePhase />)
    const opponentBoard = screen.getByTestId('opponent-board')
    const cell = within(opponentBoard).getByTestId('cell-0-0')
    await act(async () => { await userEvent.click(cell) })
    expect(useGameStore.getState().shotLog).toHaveLength(1)
    expect(useGameStore.getState().shotLog[0]!.by).toBe('PLAYER')
  })

  it('AI fires back after player shot (within 300ms)', async () => {
    render(<BattlePhase />)
    const opponentBoard = screen.getByTestId('opponent-board')
    const cell = within(opponentBoard).getByTestId('cell-0-0')
    await act(async () => { await userEvent.click(cell) })
    await waitFor(() => {
      expect(useGameStore.getState().shotLog).toHaveLength(2)
    }, { timeout: 500 })
    expect(useGameStore.getState().shotLog[1]!.by).toBe('AI')
  })

  it('shot log renders after a shot', async () => {
    render(<BattlePhase />)
    const cell = within(screen.getByTestId('opponent-board')).getByTestId('cell-0-0')
    await act(async () => { await userEvent.click(cell) })
    await waitFor(() => expect(screen.getByTestId('shot-log')).toBeInTheDocument())
  })

  it('player cannot fire on AI turn (verified via store)', () => {
    // This is covered more precisely in gameStore.test.ts — verify at component level
    // by checking currentTurn is 'AI' after a player shot before the AI delay elapses
    vi.useFakeTimers()
    render(<BattlePhase />)
    const oppBoard = screen.getByTestId('opponent-board')
    // Fire synchronously without running timers
    act(() => {
      within(oppBoard).getByTestId('cell-0-0').click()
    })
    expect(useGameStore.getState().currentTurn).toBe('AI')
    const logAfterFirst = useGameStore.getState().shotLog.length
    // Try second click on AI turn — should be blocked
    act(() => {
      within(oppBoard).getByTestId('cell-0-1').click()
    })
    expect(useGameStore.getState().shotLog.length).toBe(logAfterFirst)
    vi.useRealTimers()
  })
})
