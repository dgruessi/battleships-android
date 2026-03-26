import { useEffect, useCallback, useState, useRef } from 'react'
import { useGameStore, AI_TURN_DELAY_MS } from '@/store/gameStore'
import { Coordinate } from '@/models/types'
import { soundManager } from '@/audio/soundManager'
import GridBoard from '@/components/grid/GridBoard'
import HealthBar from '@/components/ui/HealthBar'
import ShotLog from '@/components/ui/ShotLog'
import './BattlePhase.css'

export default function BattlePhase() {
  const {
    playerBoard,
    opponentBoard,
    currentTurn,
    shotLog,
    playerFire,
    triggerAITurn,
  } = useGameStore()

  const [aiThinking, setAIThinking] = useState(false)
  const prevLogLen = useRef(0)

  // Play sound for each new shot
  useEffect(() => {
    if (shotLog.length === 0) { prevLogLen.current = 0; return }
    if (shotLog.length <= prevLogLen.current) return
    prevLogLen.current = shotLog.length
    const last = shotLog[shotLog.length - 1]!
    if (last.result === 'SUNK') soundManager.playEffect('sunk')
    else if (last.result === 'HIT') soundManager.playEffect('hit')
    else soundManager.playEffect('miss')
  }, [shotLog])

  // Trigger AI turn automatically after player fires
  useEffect(() => {
    if (currentTurn !== 'AI') return
    setAIThinking(true)
    const delay = AI_TURN_DELAY_MS()
    const timer = setTimeout(() => {
      triggerAITurn()
      setAIThinking(false)
    }, delay)
    return () => clearTimeout(timer)
  }, [currentTurn, triggerAITurn])

  const handleAttack = useCallback(
    (coord: Coordinate) => {
      if (currentTurn !== 'PLAYER') return
      playerFire(coord)
    },
    [currentTurn, playerFire]
  )

  return (
    <div className="battle-phase" data-testid="phase-battle">
      {/* Enemy grid — top on mobile, left on desktop */}
      <div className="battle-grid-section">
        <GridBoard
          board={opponentBoard}
          mode="attack"
          isActive={currentTurn === 'PLAYER'}
          onCellClick={handleAttack}
          label="ENEMY WATERS"
          labelColor="var(--color-enemy-label)"
          data-testid="opponent-board"
        />
      </div>

      {/* Center column: health bars + status + shot log */}
      <div className="battle-center">
        <div className="battle-health-row">
          <HealthBar board={opponentBoard} label="Enemy" />
          <HealthBar board={playerBoard} label="You" />
        </div>
        {aiThinking && (
          <div className="ai-thinking" data-testid="ai-thinking">
            <span className="anim-targeting">ENEMY TARGETING...</span>
          </div>
        )}
        <ShotLog shotLog={shotLog} />
      </div>

      {/* Player grid — bottom on mobile, right on desktop */}
      <div className="battle-grid-section">
        <GridBoard
          board={playerBoard}
          mode="defense"
          label="YOUR FLEET"
          labelColor="var(--color-own-label)"
          data-testid="player-board"
        />
      </div>
    </div>
  )
}
