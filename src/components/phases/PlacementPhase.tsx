import { useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Orientation, CellState } from '@/constants/game'
import { SHIP_DEFINITIONS } from '@/constants/ships'
import { Coordinate } from '@/models/types'
import { toIndex } from '@/utils/coordinates'
import { isValidPlacement, getShipCells, allShipsPlaced } from '@/logic/shipPlacement'
import { soundManager } from '@/audio/soundManager'
import GridBoard from '@/components/grid/GridBoard'
import ShipDock from '@/components/ship/ShipDock'
import DifficultyPicker from '@/components/ui/DifficultyPicker'
import Button from '@/components/ui/Button'
import HighscoreModal from '@/components/ui/HighscoreModal'
import './PlacementPhase.css'

interface PlacementPhaseProps {
  setupMode?: boolean
}

export default function PlacementPhase({ setupMode }: PlacementPhaseProps) {
  const {
    playerBoard,
    difficulty,
    playerName,
    setDifficulty,
    setPlayerName,
    startPlacement,
    placeShipOnBoard,
    autoPlaceAll,
    clearPlacements,
    startBattle,
  } = useGameStore()

  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<Orientation>(Orientation.HORIZONTAL)
  const [ghostCells, setGhostCells] = useState<Set<number>>(new Set())
  const [ghostValid, setGhostValid] = useState(false)
  const [pendingCoord, setPendingCoord] = useState<Coordinate | null>(null)
  const [showHighscores, setShowHighscores] = useState(false)

  const allPlaced = allShipsPlaced(playerBoard)
  const selectedDef = SHIP_DEFINITIONS.find((d) => d.id === selectedShipId) ?? null

  const handleCellHover = useCallback(
    (coord: Coordinate | null) => {
      if (!selectedDef || !coord) {
        setGhostCells(new Set())
        return
      }
      const cells = getShipCells(coord, selectedDef.size, orientation)
      const valid = isValidPlacement(playerBoard.grid, coord, selectedDef.size, orientation)
      setGhostCells(new Set(cells.map((c) => toIndex(c))))
      setGhostValid(valid)
    },
    [selectedDef, orientation, playerBoard.grid]
  )

  // Place the given ship at the given coord, auto-advance selection
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
        // Ship selected — try to place it here
        doPlace(selectedDef, coord)
      } else {
        // No ship selected — store as pending target (if cell is empty)
        const cell = playerBoard.grid[toIndex(coord)]
        if (cell?.state === CellState.EMPTY) {
          setPendingCoord(coord)
        }
      }
    },
    [selectedDef, playerBoard.grid, doPlace]
  )

  const handleShipSelect = useCallback(
    (id: string) => {
      const def = SHIP_DEFINITIONS.find((d) => d.id === id)
      if (!def) return

      // If there's a pending coord from clicking water first, place immediately
      if (pendingCoord) {
        if (isValidPlacement(playerBoard.grid, pendingCoord, def.size, orientation)) {
          doPlace(def, pendingCoord)
          return
        }
        // Pending coord invalid for this ship — clear it and just select
        setPendingCoord(null)
      }

      setSelectedShipId(id)
      setGhostCells(new Set())
    },
    [pendingCoord, orientation, playerBoard.grid, doPlace]
  )

  if (setupMode) {
    return (
      <div className="placement-phase" data-testid="phase-setup">
        <div className="setup-name-row">
          <label className="setup-name-label" htmlFor="commander-name">
            Commander
          </label>
          <input
            id="commander-name"
            className="setup-name-input"
            type="text"
            maxLength={20}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        <DifficultyPicker value={difficulty} onChange={setDifficulty} />

        <Button
          variant="primary"
          onClick={() => {
            soundManager.playEffect('click')
            startPlacement()
          }}
        >
          Place Ships
        </Button>

        <Button variant="secondary" onClick={() => setShowHighscores(true)}>
          Highscores
        </Button>

        {showHighscores && <HighscoreModal onClose={() => setShowHighscores(false)} />}
      </div>
    )
  }

  return (
    <div className="placement-phase" data-testid="phase-placement">
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />

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
            label="YOUR FLEET"
            labelColor="var(--color-own-label)"
            data-testid="player-board"
          />
        </div>

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
              Rotate ({orientation === Orientation.HORIZONTAL ? 'H' : 'V'})
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
              Auto Place
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
              Clear
            </Button>
          </div>

          <Button
            variant="primary"
            disabled={!allPlaced}
            onClick={() => {
              soundManager.playEffect('click')
              startBattle()
            }}
            data-testid="start-battle-btn"
          >
            Start Battle
          </Button>
        </div>
      </div>
    </div>
  )
}
