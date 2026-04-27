import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { soundManager } from '@/audio/soundManager'
import HighscoreModal from '@/components/ui/HighscoreModal'
import Button from '@/components/ui/Button'
import titleScreenImg from '@/assets/images/title_screen.png.png'
import './TitleScreen.css'

export default function TitleScreen() {
  const { playerName, setPlayerName, startPlacement, startLobby } = useGameStore()
  const [showHighscores, setShowHighscores] = useState(false)
  const [muted, setMuted] = useState(soundManager.isMuted())

  function toggleMute() {
    const next = !muted
    soundManager.setMuted(next)
    setMuted(next)
  }

  return (
    <div className="title-screen" data-testid="phase-setup">
      <button
        className={`title-mute-btn${muted ? ' muted' : ''}`}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '[ SND OFF ]' : '[ SND ON ]'}
      </button>

      <div
        className="title-hero"
        style={{ backgroundImage: `url(${titleScreenImg})` }}
        aria-hidden
      />

      <div className="title-overlay-panel">
        <h4 className="title-overlay-heading">Place Your Fleet</h4>

        <div className="title-name-row">
          <label className="title-name-label" htmlFor="ts-commander">Commander</label>
          <input
            id="ts-commander"
            className="title-name-input"
            type="text"
            maxLength={20}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        <div className="title-actions">
          <Button
            variant="primary"
            className="title-place-btn"
            onClick={() => {
              soundManager.playEffect('click')
              startPlacement()
            }}
          >
            Singleplayer
          </Button>
          <Button
            variant="secondary"
            className="title-place-btn"
            onClick={() => {
              soundManager.playEffect('click')
              startLobby()
            }}
          >
            Multiplayer
          </Button>
          <Button variant="secondary" onClick={() => setShowHighscores(true)}>
            Highscores
          </Button>
        </div>
      </div>

      {showHighscores && <HighscoreModal onClose={() => setShowHighscores(false)} />}
    </div>
  )
}
