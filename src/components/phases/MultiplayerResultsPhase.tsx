import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/store/multiplayerStore'
import { GamePhase } from '@/constants/game'
import { soundManager } from '@/audio/soundManager'
import Button from '@/components/ui/Button'
import './ResultsPhase.css'
import './MultiplayerResultsPhase.css'

export default function MultiplayerResultsPhase() {
  const resetGame = useGameStore((s) => s.resetGame)
  const returnToLobby = useGameStore((s) => s.returnToLobby)
  const startMultiPlacement = useGameStore((s) => s.startMultiPlacement)
  const playerName = useGameStore((s) => s.playerName)
  const resetMultiplayer = useMultiplayerStore((s) => s.resetMultiplayer)
  const clearBattleState = useMultiplayerStore((s) => s.clearBattleState)

  const { roomId, myUid, opponentName, winnerUid } = {
    roomId: useMultiplayerStore((s) => s.roomId),
    myUid: useMultiplayerStore((s) => s.myUid),
    opponentName: useMultiplayerStore((s) => s.opponentName),
    winnerUid: useMultiplayerStore((s) => s.winnerUid),
  }

  const iWon = winnerUid === myUid
  const [rematchPending, setRematchPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const unsubRef = useRef<Unsubscribe | null>(null)

  // Watch room for rematch (status → PLACING) triggered by either player
  useEffect(() => {
    if (!roomId) return
    unsubRef.current = onSnapshot(doc(db!, 'rooms', roomId), (snap) => {
      if (!snap.exists()) return
      if (snap.data().status === 'PLACING') {
        unsubRef.current?.()
        clearBattleState()
        startMultiPlacement()
        useGameStore.setState({ phase: GamePhase.MULTI_PLACEMENT })
      }
    })
    return () => unsubRef.current?.()
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRevanche() {
    if (!roomId) return
    setRematchPending(true)
    setErrorMsg('')
    try {
      const rematchFn = httpsCallable(functions!, 'startRematch')
      await rematchFn({ roomId })
      // Room watcher will transition both players automatically
    } catch (e) {
      const errCode = (e as { code?: string }).code ?? 'unknown'
      setErrorMsg(`Revanche fehlgeschlagen. [${errCode}]`)
      setRematchPending(false)
    }
  }

  function handleNewGame() {
    soundManager.playEffect('click')
    resetMultiplayer()
    returnToLobby()
  }

  function handleMainMenu() {
    soundManager.playEffect('click')
    resetMultiplayer()
    resetGame()
  }

  return (
    <div className="results-overlay" data-testid="phase-multi-results">
      <div className={`results-modal ${iWon ? 'victory' : 'defeat'}`}>
        <h2 className={`results-title anim-victory ${iWon ? 'title-victory' : 'title-defeat'}`}>
          {iWon ? 'SIEG!' : 'NIEDERLAGE'}
        </h2>
        <p className="results-subtitle">
          {iWon
            ? `${playerName}, du hast ${opponentName ?? 'den Gegner'} versenkt!`
            : `${opponentName ?? 'Der Gegner'} hat deine Flotte vernichtet.`}
        </p>

        {errorMsg && <p className="multi-results-error">{errorMsg}</p>}

        {rematchPending && !errorMsg && (
          <p className="multi-results-waiting">Warte auf Revanche…</p>
        )}

        <div className="results-actions">
          <Button
            variant="primary"
            onClick={() => { soundManager.playEffect('click'); handleRevanche() }}
            disabled={rematchPending}
          >
            {rematchPending ? 'Warte…' : 'Revanche!'}
          </Button>
          <Button variant="secondary" onClick={handleNewGame}>
            Neues Spiel
          </Button>
          <Button variant="secondary" onClick={handleMainMenu}>
            Hauptmenü
          </Button>
        </div>
      </div>
    </div>
  )
}
