import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/store/multiplayerStore'
import { Orientation, CellState, GamePhase } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { Coordinate } from '@/models/types'
import { toIndex } from '@/utils/coordinates'
import { isValidPlacement, getShipCells, allShipsPlaced } from '@/logic/shipPlacement'
import { soundManager } from '@/audio/soundManager'
import GridBoard from '@/components/grid/GridBoard'
import ShipDock from '@/components/ship/ShipDock'
import Button from '@/components/ui/Button'
import './PlacementPhase.css'
import './MultiplayerPlacementPhase.css'

// Maps local ship IDs to the server-side fleet type names
const SHIP_ID_TO_CLOUD: Record<string, string> = {
  carrier:    'CARRIER',
  battleship: 'CRUISER',
  cruiser:    'DESTROYER_A',
  submarine:  'DESTROYER_B',
  destroyer:  'PATROL_BOAT',
}

export default function MultiplayerPlacementPhase() {
  const {
    playerBoard,
    placeShipOnBoard,
    autoPlaceAll,
    clearPlacements,
  } = useGameStore()
  const startMultiPlacement = useGameStore((s) => s.startMultiPlacement)

  const { roomId, opponentName, opponentUid, returnToLobby } = {
    roomId: useMultiplayerStore((s) => s.roomId),
    opponentName: useMultiplayerStore((s) => s.opponentName),
    opponentUid: useMultiplayerStore((s) => s.opponentUid),
    returnToLobby: useGameStore((s) => s.returnToLobby),
  }
  const setMyBoard = useMultiplayerStore((s) => s.setMyBoard)

  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<Orientation>(Orientation.HORIZONTAL)
  const [ghostCells, setGhostCells] = useState<Set<number>>(new Set())
  const [ghostValid, setGhostValid] = useState(false)
  const [pendingCoord, setPendingCoord] = useState<Coordinate | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [opponentReady, setOpponentReady] = useState(false)

  const unsubRef = useRef<Unsubscribe | null>(null)
  const opponentSubRef = useRef<Unsubscribe | null>(null)
  const allPlaced = allShipsPlaced(playerBoard)
  const selectedDef = SHIP_DEFINITIONS.find((d) => d.id === selectedShipId) ?? null

  // Watch room for BATTLE status (or rematch reset) after submission
  useEffect(() => {
    if (!submitted || !roomId) return
    let initial = true
    unsubRef.current = onSnapshot(doc(db!, 'rooms', roomId), (snap) => {
      if (!snap.exists()) return
      const status = snap.data().status
      if (status === 'BATTLE') {
        unsubRef.current?.()
        opponentSubRef.current?.()
        useGameStore.setState({ phase: GamePhase.MULTI_BATTLE })
      } else if (status === 'PLACING' && !initial) {
        // Rematch: room cycled back to PLACING after a completed game
        unsubRef.current?.()
        opponentSubRef.current?.()
        setSubmitted(false)
        setOpponentReady(false)
        startMultiPlacement()
      }
      initial = false
    })
    return () => unsubRef.current?.()
  }, [submitted, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Watch opponent's player doc to detect when they've confirmed their fleet
  useEffect(() => {
    if (!submitted || !roomId || !opponentUid) return
    opponentSubRef.current = onSnapshot(
      doc(db!, 'rooms', roomId, 'players', opponentUid),
      (snap) => {
        if (snap.exists() && snap.data()?.ready === true) {
          setOpponentReady(true)
        }
      }
    )
    return () => opponentSubRef.current?.()
  }, [submitted, roomId, opponentUid])

  const handleCellHover = useCallback(
    (coord: Coordinate | null) => {
      if (!selectedDef || !coord) { setGhostCells(new Set()); return }
      const cells = getShipCells(coord, selectedDef.size, orientation)
      const valid = isValidPlacement(playerBoard.grid, coord, selectedDef.size, orientation)
      setGhostCells(new Set(cells.map((c) => toIndex(c))))
      setGhostValid(valid)
    },
    [selectedDef, orientation, playerBoard.grid]
  )

  const doPlace = useCallback(
    (def: typeof selectedDef, coord: Coordinate) => {
      if (!def) return
      if (!isValidPlacement(playerBoard.grid, coord, def.size, orientation)) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        soundManager.playEffect('invalid')
        return
      }
      placeShipOnBoard(def, coord, orientation)
      soundManager.playEffect('place')
      setPendingCoord(null)
      setGhostCells(new Set())
      const placed = new Set([...playerBoard.ships.map((s) => s.definition.id), def.id])
      const next = SHIP_DEFINITIONS.find((d) => !placed.has(d.id))
      setSelectedShipId(next?.id ?? null)
    },
    [orientation, playerBoard, placeShipOnBoard]
  )

  const handleCellClick = useCallback(
    (coord: Coordinate) => {
      if (selectedDef) {
        doPlace(selectedDef, coord)
      } else {
        const cell = playerBoard.grid[toIndex(coord)]
        if (cell?.state === CellState.EMPTY) setPendingCoord(coord)
      }
    },
    [selectedDef, playerBoard.grid, doPlace]
  )

  const handleShipSelect = useCallback(
    (id: string) => {
      const def = SHIP_DEFINITIONS.find((d) => d.id === id)
      if (!def) return
      if (pendingCoord) {
        if (isValidPlacement(playerBoard.grid, pendingCoord, def.size, orientation)) {
          doPlace(def, pendingCoord)
          return
        }
        setPendingCoord(null)
      }
      setSelectedShipId(id)
      setGhostCells(new Set())
    },
    [pendingCoord, orientation, playerBoard.grid, doPlace]
  )

  async function handleConfirmFleet() {
    if (!allPlaced || !roomId) return
    setSubmitting(true)
    setErrorMsg('')

    try {
      const ships = playerBoard.ships.map((s) => ({
        type: SHIP_ID_TO_CLOUD[s.definition.id] ?? s.definition.id.toUpperCase(),
        orientation: s.orientation === Orientation.HORIZONTAL ? 'HORIZONTAL' : 'VERTICAL',
        row: s.origin.row,
        col: s.origin.col,
      }))

      setMyBoard(playerBoard)

      const submitFn = httpsCallable(functions!, 'submitPlacement')
      await submitFn({ roomId, ships })
      setSubmitted(true)
    } catch (e) {
      console.error('submitPlacement failed:', e)
      const errCode = (e as { code?: string }).code ?? 'unknown'
      setErrorMsg(`Fehler beim Senden. [${errCode}]`)
      setSubmitting(false)
    }
  }

  return (
    <div className="placement-phase" data-testid="phase-multi-placement">
      {submitted && (
        <div className="multi-placement-waiting">
          <p className={`multi-placement-waiting-text${opponentReady ? ' ready' : ''}`}>
            {opponentReady ? 'Spiel startet…' : `Warte auf ${opponentName ?? 'Gegner'}…`}
          </p>
          <p className="multi-placement-waiting-sub">
            {opponentReady
              ? `${opponentName ?? 'Gegner'} ist bereit!`
              : 'Deine Flotte wurde übermittelt'}
          </p>
        </div>
      )}

      {!submitted && (
        <div className="placement-layout">
          <div className="placement-grid-area">
            <GridBoard
              board={playerBoard}
              mode="placement"
              onCellClick={handleCellClick}
              onCellHover={handleCellHover}
              ghostCells={ghostCells}
              ghostValid={ghostValid}
              pendingCell={pendingCoord ? toIndex(pendingCoord) : undefined}
              label="DEINE FLOTTE"
              labelColor="var(--color-own-label)"
            />
          </div>

          <div className="placement-side-column">
            <div className="placement-controls">
              <ShipDock
                placedShips={playerBoard.ships}
                selectedShipId={selectedShipId}
                orientation={orientation}
                onSelectShip={handleShipSelect}
              />

              <div className="placement-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    soundManager.playEffect('click')
                    setOrientation((o) =>
                      o === Orientation.HORIZONTAL ? Orientation.VERTICAL : Orientation.HORIZONTAL
                    )
                  }}
                >
                  Drehen ({orientation === Orientation.HORIZONTAL ? 'H' : 'V'})
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    soundManager.playEffect('click')
                    autoPlaceAll()
                    setPendingCoord(null)
                    setSelectedShipId(null)
                  }}
                >
                  Auto
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    soundManager.playEffect('click')
                    clearPlacements()
                    setPendingCoord(null)
                    setSelectedShipId(null)
                  }}
                >
                  Löschen
                </Button>
              </div>

              {errorMsg && <p className="multi-placement-error">{errorMsg}</p>}
            </div>

            <div className="placement-start-wrap">
              <Button
                variant="primary"
                disabled={!allPlaced || submitting}
                onClick={() => {
                  soundManager.playEffect('click')
                  handleConfirmFleet()
                }}
              >
                {submitting ? 'Sende…' : 'Flotte bestätigen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Always-visible back button when not submitted */}
      {!submitted && (
        <div className="multi-placement-back">
          <Button variant="secondary" onClick={() => {
            soundManager.playEffect('click')
            returnToLobby()
          }}>
            ← Lobby
          </Button>
        </div>
      )}
    </div>
  )
}
