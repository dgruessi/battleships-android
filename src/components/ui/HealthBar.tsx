import { BoardState } from '@/models/types'
import './HealthBar.css'

interface HealthBarProps {
  board: BoardState
  label: string
}

export default function HealthBar({ board, label }: HealthBarProps) {
  const total = board.ships.length
  const alive = board.ships.filter((s) => !s.isSunk).length

  return (
    <div className="health-bar" data-testid={`health-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <span className="health-label">{label}</span>
      <div className="health-segments">
        {board.ships.map((ship) => (
          <div
            key={ship.definition.id}
            className={`health-segment${ship.isSunk ? ' sunk' : ''}`}
            title={ship.definition.name}
          />
        ))}
      </div>
      <span className="health-count">
        {alive}/{total}
      </span>
    </div>
  )
}
