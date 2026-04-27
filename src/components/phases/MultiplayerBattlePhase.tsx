import { useEffect, useCallback, useState, useRef } from 'react'
import {
  doc,
  collection,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore, type ServerCellState } from '@/store/multiplayerStore'
import { GamePhase, CellState, Orientation } from '@/constants/game'
import { Coordinate, BoardState } from '@/models/types'
import { toIndex } from '@/utils/coordinates'
import { getShipCells } from '@/logic/shipPlacement'
import { soundManager } from '@/audio/soundManager'
import GridBoard from '@/components/grid/GridBoard'
import HealthBar from '@/components/ui/HealthBar'
import ShotLog from '@/components/ui/ShotLog'
import Button from '@/components/ui/Button'
import './BattlePhase.css'
import './MultiplayerBattlePhase.css'

// Fake ShipDefinition entries for opponent HealthBar — only id, name, size matter
const OPPONENT_FLEET = [
  { id: 'CARRIER',     name: 'Träger',          size: 5 },
  { id: 'CRUISER',     name: 'Kreuzer',          size: 4 },
  { id: 'DESTROYER_A', name: 'Zerstörer A',      size: 3 },
  { id: 'DESTROYER_B', name: 'Zerstörer B',      size: 3 },
  { id: 'PATROL_BOAT', name: 'Patrouillenboot',  size: 2 },
]

function serverToGameCell(s: ServerCellState): CellState {
  if (s === 'EMPTY') return CellState.MISS
  if (s === 'HIT')   return CellState.HIT
  if (s === 'SUNK')  return CellState.SUNK
  return CellState.EMPTY
}

function buildAttackBoard(attackGrid: ServerCellState[]): BoardState {
  return {
    grid: attackGrid.map((s) => ({
      state: serverToGameCell(s),
      shipId: null,
      shipSegment: null,
    })),
    ships: [],
  }
}

function buildDefenseBoard(myBoard: BoardState, defenseGrid: ServerCellState[]): BoardState {
  const flat = defenseGrid
  const grid = myBoard.grid.map((cell, idx) => {
    const s = flat[idx] as ServerCellState
    if (s === 'EMPTY') return { ...cell, state: CellState.MISS }
    if (s === 'HIT')   return { ...cell, state: CellState.HIT }
    if (s === 'SUNK')  return { ...cell, state: CellState.SUNK }
    return cell
  })
  const ships = myBoard.ships.map((ship) => {
    if (ship.isSunk) return ship
    const cells = getShipCells(ship.origin, ship.definition.size, ship.orientation)
    const allSunk = cells.every((c) => flat[toIndex(c)] === 'SUNK')
    return allSunk
      ? { ...ship, isSunk: true, hits: new Set(Array.from({ length: ship.definition.size }, (_, i) => i)) }
      : ship
  })
  return { grid, ships }
}

export default function MultiplayerBattlePhase() {
  const phase = useGameStore((s) => s.phase)
  const playerName = useGameStore((s) => s.playerName)
  const returnToLobby = useGameStore((s) => s.returnToLobby)

  const {
    roomId, myUid, opponentUid, opponentName,
    currentTurnUid, myBoard, attackGrid, defenseGrid, sunkOpponentTypes,
    setCurrentTurnUid, setWinnerUid, setRoomStatus, setAttackGrid, setDefenseGrid,
    addSunkOpponentType,
  } = useMultiplayerStore()

  const [firing, setFiring] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const unsubsRef = useRef<Unsubscribe[]>([])

  const isMyTurn = currentTurnUid === myUid
  const attackBoard = buildAttackBoard(attackGrid)
  const defenseBoard = buildDefenseBoard(myBoard, defenseGrid)

  // Opponent health board — fake BoardState for HealthBar
  const opponentHealthBoard: BoardState = {
    grid: Array(100).fill({ state: CellState.EMPTY, shipId: null, shipSegment: null }),
    ships: OPPONENT_FLEET.map((def) => ({
      definition: def,
      origin: { row: 0, col: 0 },
      orientation: Orientation.HORIZONTAL,
      hits: new Set<number>(),
      isSunk: sunkOpponentTypes.includes(def.id),
    })),
  }

  useEffect(() => {
    if (!roomId || !myUid || !opponentUid || phase !== GamePhase.MULTI_BATTLE) return

    let eventsInitialized = false

    // 1. Room document — turn + status
    const roomUnsub = onSnapshot(doc(db!, 'rooms', roomId), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      setCurrentTurnUid(data.currentTurnUid ?? null)
      setWinnerUid(data.winnerUid ?? null)
      const status = data.status as string
      setRoomStatus(status as 'WAITING' | 'PLACING' | 'BATTLE' | 'RESULTS')
      if (status === 'RESULTS') {
        unsubsRef.current.forEach((u) => u())
        unsubsRef.current = []
        useGameStore.setState({ phase: GamePhase.MULTI_RESULTS })
      }
    })

    // 2. Attack grid — what I've fired at opponent (stored under opponentUid)
    const attackUnsub = onSnapshot(
      doc(db!, 'rooms', roomId, 'maskedBoards', opponentUid),
      (snap) => {
        if (snap.exists()) setAttackGrid(snap.data().cells as ServerCellState[])
      }
    )

    // 3. Defense grid — what opponent has fired at me (stored under myUid)
    const defenseUnsub = onSnapshot(
      doc(db!, 'rooms', roomId, 'maskedBoards', myUid),
      (snap) => {
        if (snap.exists()) setDefenseGrid(snap.data().cells as ServerCellState[])
      }
    )

    // 4. Events — for sounds (skip existing events on mount)
    const eventsUnsub = onSnapshot(collection(db!, 'rooms', roomId, 'events'), (snap) => {
      if (!eventsInitialized) { eventsInitialized = true; return }
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const ev = change.doc.data()
        if (ev.type === 'SHOT_RESULT') {
          const outcome = ev.payload?.outcome as string
          if (outcome === 'SUNK') {
            soundManager.playEffect('sunk')
            if (ev.byUid === myUid && ev.payload?.sunkShipType) {
              addSunkOpponentType(ev.payload.sunkShipType as string)
            }
          } else if (outcome === 'HIT') {
            soundManager.playEffect('hit')
          } else {
            soundManager.playEffect('miss')
          }
        }
      })
    })

    unsubsRef.current = [roomUnsub, attackUnsub, defenseUnsub, eventsUnsub]
    return () => {
      unsubsRef.current.forEach((u) => u())
      unsubsRef.current = []
    }
  }, [roomId, myUid, opponentUid, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAttack = useCallback(
    async (coord: Coordinate) => {
      if (!isMyTurn || firing || !roomId) return
      setFiring(true)
      setErrorMsg('')
      try {
        const fireFn = httpsCallable(functions!, 'fireShot')
        await fireFn({ roomId, row: coord.row, col: coord.col })
      } catch (e) {
        const errCode = (e as { code?: string }).code ?? 'unknown'
        setErrorMsg(`Schuss fehlgeschlagen. [${errCode}]`)
      } finally {
        setFiring(false)
      }
    },
    [isMyTurn, firing, roomId]
  )

  // Build a minimal shot log for display (just last 10 events from grids)
  // We derive this from the attack grid cell states — a lightweight alternative
  // to maintaining a full ShotRecord list. ShotLog expects ShotRecord[], but
  // we pass an empty array and rely on the "ENEMY TARGETING / YOUR TURN" header.
  const shotLog: import('@/models/types').ShotRecord[] = []

  return (
    <div className="battle-phase" data-testid="phase-multi-battle">
      {/* Attack grid */}
      <div className="battle-grid-section">
        <GridBoard
          board={attackBoard}
          mode="attack"
          isActive={isMyTurn && !firing}
          onCellClick={handleAttack}
          label={`GEWÄSSER VON ${(opponentName ?? 'FEIND').toUpperCase()}`}
          labelColor="var(--color-enemy-label)"
        />
      </div>

      {/* Center column */}
      <div className="battle-center">
        <div className="battle-health-row">
          <HealthBar board={opponentHealthBoard} label={opponentName ?? 'Feind'} />
          <HealthBar board={defenseBoard} label={playerName} />
        </div>

        <div className={`multi-turn-indicator${isMyTurn ? ' my-turn' : ' opponent-turn'}`}>
          {isMyTurn
            ? firing ? 'FEUERT…' : 'AN DIR — FEUER!'
            : `${(opponentName ?? 'FEIND').toUpperCase()} ZIELT…`}
        </div>

        {errorMsg && <p className="multi-battle-error">{errorMsg}</p>}

        <ShotLog shotLog={shotLog} />
      </div>

      {/* Defense grid */}
      <div className="battle-grid-section">
        <GridBoard
          board={defenseBoard}
          mode="defense"
          label="DEINE FLOTTE"
          labelColor="var(--color-own-label)"
        />
      </div>

      <div className="multi-battle-leave">
        <Button variant="secondary" onClick={() => {
          soundManager.playEffect('click')
          returnToLobby()
        }}>
          Verlassen
        </Button>
      </div>
    </div>
  )
}
