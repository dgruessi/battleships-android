import { ReactNode, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { GamePhase } from '@/constants/game'
import { soundManager } from '@/audio/soundManager'
import './AppShell.css'

interface AppShellProps {
  children: ReactNode
}

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.SETUP]: 'Place Your Fleet',
  [GamePhase.PLACEMENT]: 'Place Your Fleet',
  [GamePhase.BATTLE]: 'Battle!',
  [GamePhase.RESULTS]: 'Battle Over',
}

export default function AppShell({ children }: AppShellProps) {
  const phase = useGameStore((s) => s.phase)
  const [muted, setMuted] = useState(soundManager.isMuted())

  function toggleMute() {
    const next = !muted
    soundManager.setMuted(next)
    setMuted(next)
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <h1 className="app-title">BATTLESHIPS</h1>
        <span className="app-phase-label">{PHASE_LABELS[phase]}</span>
        <button
          className={`mute-btn${muted ? ' muted' : ''}`}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '[ SND OFF ]' : '[ SND ON ]'}
        </button>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
