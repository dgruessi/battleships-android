import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/store/multiplayerStore'
import { GamePhase } from '@/constants/game'
import { soundManager, MusicTrack } from '@/audio/soundManager'
import AppShell from '@/components/layout/AppShell'
import TitleScreen from '@/components/phases/TitleScreen'
import PlacementPhase from '@/components/phases/PlacementPhase'
import BattlePhase from '@/components/phases/BattlePhase'
import ResultsPhase from '@/components/phases/ResultsPhase'
import LobbyScreen from '@/components/phases/LobbyScreen'
import MultiplayerPlacementPhase from '@/components/phases/MultiplayerPlacementPhase'
import MultiplayerBattlePhase from '@/components/phases/MultiplayerBattlePhase'
import MultiplayerResultsPhase from '@/components/phases/MultiplayerResultsPhase'
import InstallPrompt from '@/components/ui/InstallPrompt'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)
  const myUid = useMultiplayerStore((s) => s.myUid)
  const winnerUid = useMultiplayerStore((s) => s.winnerUid)

  useEffect(() => {
    if (phase === GamePhase.LOBBY || phase === GamePhase.MULTI_PLACEMENT) {
      soundManager.playMusic('battle')
      return
    }
    if (phase === GamePhase.MULTI_BATTLE) {
      soundManager.playMusic('battle')
      return
    }
    if (phase === GamePhase.MULTI_RESULTS) {
      soundManager.playMusic(winnerUid === myUid ? 'win' : 'lose')
      return
    }

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
  }, [phase, winner, winnerUid, myUid])

  if (phase === GamePhase.SETUP) {
    return (
      <>
        <TitleScreen />
        <InstallPrompt />
      </>
    )
  }

  if (phase === GamePhase.LOBBY) return <LobbyScreen />
  if (phase === GamePhase.MULTI_PLACEMENT) return <MultiplayerPlacementPhase />
  if (phase === GamePhase.MULTI_BATTLE) return <MultiplayerBattlePhase />
  if (phase === GamePhase.MULTI_RESULTS) return <MultiplayerResultsPhase />

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
