import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { GamePhase } from '@/constants/game'
import { soundManager, MusicTrack } from '@/audio/soundManager'
import AppShell from '@/components/layout/AppShell'
import TitleScreen from '@/components/phases/TitleScreen'
import PlacementPhase from '@/components/phases/PlacementPhase'
import BattlePhase from '@/components/phases/BattlePhase'
import ResultsPhase from '@/components/phases/ResultsPhase'
import InstallPrompt from '@/components/ui/InstallPrompt'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)

  useEffect(() => {
    let track: MusicTrack
    if (phase === GamePhase.SETUP) {
      track = 'intro'
    } else if (phase === GamePhase.PLACEMENT) {
      track = 'placement'
    } else if (phase === GamePhase.BATTLE) {
      track = 'battle'
    } else {
      track = winner === 'PLAYER' ? 'win' : 'lose'
    }
    soundManager.playMusic(track)
  }, [phase, winner])

  if (phase === GamePhase.SETUP) {
    return (
      <>
        <TitleScreen />
        <InstallPrompt />
      </>
    )
  }

  return (
    <>
      <AppShell>
        {phase === GamePhase.PLACEMENT && <PlacementPhase />}
        {phase === GamePhase.BATTLE && <BattlePhase />}
        {phase === GamePhase.RESULTS && <ResultsPhase />}
      </AppShell>
      <InstallPrompt />
    </>
  )
}
