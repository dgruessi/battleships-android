import { useState } from 'react'
import { getHighscores, clearHighscores } from '@/utils/highscores'
import Button from '@/components/ui/Button'
import './HighscoreModal.css'

interface HighscoreModalProps {
  onClose: () => void
}

const DIFF_LABEL: Record<string, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

export default function HighscoreModal({ onClose }: HighscoreModalProps) {
  const [scores, setScores] = useState(getHighscores)

  function handleClear() {
    clearHighscores()
    setScores([])
  }

  return (
    <div className="hs-overlay" onClick={onClose}>
      <div className="hs-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="hs-title">HIGHSCORES</h2>

        {scores.length === 0 ? (
          <p className="hs-empty">No scores yet. Play a game!</p>
        ) : (
          <div className="hs-table-wrap">
            <table className="hs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Commander</th>
                  <th>Result</th>
                  <th>Shots</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={i} className={s.winner === 'PLAYER' ? 'row-win' : 'row-loss'}>
                    <td>{i + 1}</td>
                    <td className="hs-name">{s.name}</td>
                    <td className={s.winner === 'PLAYER' ? 'result-win' : 'result-loss'}>
                      {s.winner === 'PLAYER' ? 'WIN' : 'LOSS'}
                    </td>
                    <td>{s.shots}</td>
                    <td>{s.accuracy}%</td>
                    <td>{s.duration}s</td>
                    <td>{DIFF_LABEL[s.difficulty] ?? s.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="hs-actions">
          {scores.length > 0 && (
            <Button variant="danger" onClick={handleClear}>
              Clear All
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
