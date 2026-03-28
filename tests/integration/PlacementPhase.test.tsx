import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { GamePhase, DifficultyLevel } from '@/constants/game'
import PlacementPhase from '@/components/phases/PlacementPhase'

beforeEach(() => {
  useGameStore.getState().resetGame()
  useGameStore.getState().startPlacement()
})

describe('PlacementPhase', () => {
  it('renders the ship dock', () => {
    render(<PlacementPhase />)
    expect(screen.getByTestId('ship-dock')).toBeInTheDocument()
  })

  it('renders difficulty picker', () => {
    render(<PlacementPhase />)
    expect(screen.getByTestId('difficulty-picker')).toBeInTheDocument()
  })

  it('"Start Battle" button is disabled when no ships placed', () => {
    render(<PlacementPhase />)
    const btn = screen.getByTestId('start-battle-btn')
    expect(btn).toBeDisabled()
  })

  it('"Start Battle" button is enabled after auto-place', async () => {
    render(<PlacementPhase />)
    const autoBtn = screen.getByText(/auto place/i)
    await act(async () => { await userEvent.click(autoBtn) })
    const startBtn = screen.getByTestId('start-battle-btn')
    expect(startBtn).not.toBeDisabled()
  })

  it('all 5 ships appear in dock', () => {
    render(<PlacementPhase />)
    expect(screen.getByTestId('ship-carrier')).toBeInTheDocument()
    expect(screen.getByTestId('ship-battleship')).toBeInTheDocument()
    expect(screen.getByTestId('ship-cruiser')).toBeInTheDocument()
    expect(screen.getByTestId('ship-submarine')).toBeInTheDocument()
    expect(screen.getByTestId('ship-destroyer')).toBeInTheDocument()
  })

  it('clear resets board', async () => {
    render(<PlacementPhase />)
    const autoBtn = screen.getByText(/auto place/i)
    await act(async () => { await userEvent.click(autoBtn) })
    expect(useGameStore.getState().playerBoard.ships).toHaveLength(5)
    const clearBtn = screen.getByText(/clear/i)
    await act(async () => { await userEvent.click(clearBtn) })
    expect(useGameStore.getState().playerBoard.ships).toHaveLength(0)
  })

  it('clicking "Start Battle" transitions to BATTLE phase', async () => {
    render(<PlacementPhase />)
    await act(async () => { await userEvent.click(screen.getByText(/auto place/i)) })
    await act(async () => { await userEvent.click(screen.getByTestId('start-battle-btn')) })
    expect(useGameStore.getState().phase).toBe(GamePhase.BATTLE)
  })
})
