import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { addHighscore } from '@/utils/highscores'
import { soundManager } from '@/audio/soundManager'
import Button from '@/components/ui/Button'
import HighscoreModal from '@/components/ui/HighscoreModal'
import './ResultsPhase.css'

export default function ResultsPhase() {
  const { winner, stats, difficulty, playerName, resetGame, startPlacement } = useGameStore()
  const [showHighscores, setShowHighscores] = useState(false)
  const savedRef = useRef(false)

  const durationSec = stats.endTime && stats.startTime
    ? Math.round((stats.endTime - stats.startTime) / 1000)
    : 0
  const playerAccuracy =
    stats.playerShots > 0 ? Math.round((stats.playerHits / stats.playerShots) * 100) : 0

  // Save highscore once on mount
  useEffect(() => {
    if (savedRef.current || !winner) return
    savedRef.current = true
    addHighscore({
      name: playerName || 'Admiral',
      shots: stats.playerShots,
      accuracy: playerAccuracy,
      duration: durationSec,
      difficulty,
      winner,
      date: new Date().toLocaleDateString(),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="results-overlay" data-testid="phase-results">
      <div className={`results-modal ${winner === 'PLAYER' ? 'victory' : 'defeat'}`}>
        <h2 className={`results-title anim-victory ${winner === 'PLAYER' ? 'title-victory' : 'title-defeat'}`}>
          {winner === 'PLAYER' ? 'VICTORY!' : 'DEFEATED'}
        </h2>
        <p className="results-subtitle">
          {winner === 'PLAYER'
            ? `${playerName}, you've sunk the enemy fleet!`
            : `The enemy has sunk your fleet, ${playerName}.`}
        </p>

        <div className="results-stats">
          <div className="stat-row">
            <span className="stat-label">Your shots</span>
            <span className="stat-value">{stats.playerShots}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{playerAccuracy}%</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Enemy shots</span>
            <span className="stat-value">{stats.aiShots}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Duration</span>
            <span className="stat-value">{durationSec}s</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Difficulty</span>
            <span className="stat-value">{difficulty}</span>
          </div>
        </div>

        <div className="results-actions">
          <Button
            variant="primary"
            onClick={() => {
              soundManager.playEffect('click')
              startPlacement()
            }}
            data-testid="play-again-btn"
          >
            Play Again
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowHighscores(true)}
          >
            Highscores
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              soundManager.playEffect('click')
              resetGame()
            }}
          >
            Main Menu
          </Button>
        </div>
      </div>

      {showHighscores && <HighscoreModal onClose={() => setShowHighscores(false)} />}
    </div>
  )
}
