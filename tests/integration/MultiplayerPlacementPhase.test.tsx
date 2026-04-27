import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/store/multiplayerStore'
import { GamePhase } from '@/constants/game'

// ── Firebase mocks ────────────────────────────────────────────────────────────

vi.mock('@/firebase', () => ({ db: {}, functions: {} }))

const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn(() => ({}))
vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

const mockCallable = vi.fn()
vi.mock('firebase/functions', () => ({
  httpsCallable: () => mockCallable,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupStores() {
  useGameStore.getState().resetGame()
  // Put game into multiplayer-placement phase with a valid roomId in the store
  useGameStore.setState({ phase: GamePhase.MULTI_PLACEMENT })
  useMultiplayerStore.setState({
    roomId: 'room-123',
    opponentUid: 'uid-B',
    opponentName: 'Bob',
  })
}

// Lazily import after mocks are registered
async function renderPhase() {
  const { default: MultiplayerPlacementPhase } = await import(
    '@/components/phases/MultiplayerPlacementPhase'
  )
  return render(<MultiplayerPlacementPhase />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MultiplayerPlacementPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStores()
    // submitPlacement succeeds by default
    mockCallable.mockResolvedValue({ data: { success: true } })
    // onSnapshot returns a no-op unsubscribe by default
    mockOnSnapshot.mockReturnValue(() => {})
  })

  test('shows placement UI before confirming fleet', async () => {
    await renderPhase()
    expect(screen.getByTestId('ship-dock')).toBeInTheDocument()
    expect(screen.queryByText(/Warte auf/i)).not.toBeInTheDocument()
  })

  test('confirm button is disabled until all ships are placed', async () => {
    await renderPhase()
    const btn = screen.getByRole('button', { name: /Flotte bestätigen/i })
    expect(btn).toBeDisabled()
  })

  test('after confirming fleet, shows waiting screen not placement grid', async () => {
    // The key regression test: an immediate PLACING snapshot must NOT reset the UI
    let snapshotCallback: ((snap: object) => void) | null = null
    mockOnSnapshot.mockImplementation((_docRef: unknown, cb: (snap: object) => void) => {
      snapshotCallback = cb
      // Firestore always fires one snapshot immediately — this was the bug trigger
      cb({ exists: () => true, data: () => ({ status: 'PLACING' }) })
      return () => {}
    })

    await renderPhase()

    // Auto-place all ships so the confirm button becomes enabled
    await act(async () => {
      useGameStore.getState().autoPlaceAll()
    })

    const btn = await screen.findByRole('button', { name: /Flotte bestätigen/i })
    expect(btn).not.toBeDisabled()

    await userEvent.click(btn)

    // After submission, the waiting message must be visible
    await waitFor(() => {
      expect(screen.getByText(/Deine Flotte wurde übermittelt/i)).toBeInTheDocument()
    })

    // And the ship dock must be gone (placement UI hidden)
    expect(screen.queryByTestId('ship-dock')).not.toBeInTheDocument()
  })

  test('when room transitions to BATTLE, navigates to MULTI_BATTLE', async () => {
    // Track the room-doc callback separately from the opponent-player-doc callback.
    // The component calls onSnapshot twice: once for 'rooms/{id}' and once for
    // 'rooms/{id}/players/{opponentUid}'. We identify the room subscription by
    // checking that it fires immediately with a status field.
    let roomCallback: ((snap: object) => void) | null = null
    mockOnSnapshot.mockImplementation((_docRef: unknown, cb: (snap: object) => void) => {
      const snap = { exists: () => true, data: () => ({ status: 'PLACING', ready: false }) }
      cb(snap)
      // First call whose initial snapshot has a `status` field is the room doc
      if (roomCallback === null) roomCallback = cb
      return () => {}
    })

    await renderPhase()

    await act(async () => { useGameStore.getState().autoPlaceAll() })
    await userEvent.click(await screen.findByRole('button', { name: /Flotte bestätigen/i }))
    await waitFor(() => screen.getByText(/Deine Flotte wurde übermittelt/i))

    // Wait until the effect has subscribed (roomCallback set by a second onSnapshot call
    // after submitted → true)
    await waitFor(() => expect(mockOnSnapshot).toHaveBeenCalledTimes(2))

    // The FIRST onSnapshot call after submit is the room watcher (effects run top-to-bottom)
    const roomCb = (mockOnSnapshot as Mock).mock.calls[0]![1] as (snap: object) => void

    // Simulate opponent also submitting → server flips status to BATTLE
    await act(async () => {
      roomCb({ exists: () => true, data: () => ({ status: 'BATTLE' }) })
    })

    await waitFor(() => {
      expect(useGameStore.getState().phase).toBe(GamePhase.MULTI_BATTLE)
    })
  })

  test('a non-initial PLACING snapshot triggers rematch reset (submitted becomes false)', async () => {
    let roomCb: ((snap: object) => void) | null = null
    mockOnSnapshot.mockImplementation((_docRef: unknown, cb: (snap: object) => void) => {
      // Capture room-watcher callback on first call (top effect in component)
      if (roomCb === null) roomCb = cb
      cb({ exists: () => true, data: () => ({ status: 'PLACING', ready: false }) })
      return () => {}
    })

    await renderPhase()

    await act(async () => { useGameStore.getState().autoPlaceAll() })
    await userEvent.click(await screen.findByRole('button', { name: /Flotte bestätigen/i }))
    await waitFor(() => screen.getByText(/Deine Flotte wurde übermittelt/i))

    // Ensure both effects have subscribed and roomCb is the room-watcher
    await waitFor(() => expect(mockOnSnapshot).toHaveBeenCalledTimes(2))
    expect(roomCb).not.toBeNull()

    // Simulate the real rematch sequence: server transitions RESULTS → PLACING.
    // A duplicate PLACING snapshot (e.g. Firestore reconnect re-delivery) must NOT reset
    // the UI — only a genuine status transition triggers a rematch reset.
    await act(async () => {
      roomCb!({ exists: () => true, data: () => ({ status: 'RESULTS' }) })
    })
    await act(async () => {
      roomCb!({ exists: () => true, data: () => ({ status: 'PLACING' }) })
    })

    // Waiting screen should be gone; placement UI back
    await waitFor(() => {
      expect(screen.queryByText(/Deine Flotte wurde übermittelt/i)).not.toBeInTheDocument()
      expect(screen.getByTestId('ship-dock')).toBeInTheDocument()
    })
  })

  test('duplicate PLACING snapshot (Firestore reconnect) does NOT reset the waiting screen', async () => {
    let roomCb: ((snap: object) => void) | null = null
    mockOnSnapshot.mockImplementation((_docRef: unknown, cb: (snap: object) => void) => {
      if (roomCb === null) roomCb = cb
      cb({ exists: () => true, data: () => ({ status: 'PLACING' }) })
      return () => {}
    })

    await renderPhase()
    await act(async () => { useGameStore.getState().autoPlaceAll() })
    await userEvent.click(await screen.findByRole('button', { name: /Flotte bestätigen/i }))
    await waitFor(() => screen.getByText(/Deine Flotte wurde übermittelt/i))
    await waitFor(() => expect(mockOnSnapshot).toHaveBeenCalledTimes(2))

    // Fire another PLACING snapshot — simulates a Firestore reconnect re-delivering the
    // current status. This must NOT reset the waiting screen.
    await act(async () => {
      roomCb!({ exists: () => true, data: () => ({ status: 'PLACING' }) })
    })

    // Waiting screen must still be visible
    expect(screen.getByText(/Deine Flotte wurde übermittelt/i)).toBeInTheDocument()
    expect(screen.queryByTestId('ship-dock')).not.toBeInTheDocument()
  })
})
