import { DifficultyLevel } from '@/constants/game'

export interface HighscoreEntry {
  name: string
  shots: number
  accuracy: number
  duration: number
  difficulty: DifficultyLevel
  winner: 'PLAYER' | 'AI'
  date: string
}

const KEY = 'battleships_highscores_v1'
const MAX = 20

export function getHighscores(): HighscoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHighscore(entry: HighscoreEntry): void {
  const list = getHighscores()
  list.push(entry)
  // Wins come first; within wins, fewer shots = better rank
  list.sort((a, b) => {
    if (a.winner !== b.winner) return a.winner === 'PLAYER' ? -1 : 1
    return a.shots - b.shots
  })
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch { /* ignore */ }
}

export function clearHighscores(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
