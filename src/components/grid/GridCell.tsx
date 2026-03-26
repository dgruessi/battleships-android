import { CellState } from '@/constants/game'
import { GridCell as GridCellType } from '@/models/types'
import { cn } from '@/utils/cn'
import './GridCell.css'

interface GridCellProps {
  cell: GridCellType
  row: number
  col: number
  mode: 'placement' | 'defense' | 'attack'
  isGhost?: boolean
  isGhostValid?: boolean
  isPending?: boolean
  animClass?: string
  onClick?: () => void
  onTouchStart?: () => void
  onMouseEnter?: () => void
}

const STATE_ICONS: Partial<Record<CellState, string>> = {
  [CellState.HIT]: 'X',
  [CellState.MISS]: '•',
  [CellState.SUNK]: '✕',
}

export default function GridCell({
  cell,
  row,
  col,
  mode,
  isGhost,
  isGhostValid,
  isPending,
  animClass,
  onClick,
  onTouchStart,
  onMouseEnter,
}: GridCellProps) {
  const isInteractive = mode === 'placement' || (mode === 'attack' && !isGhost)
  const canFire = isInteractive && (cell.state === CellState.EMPTY || cell.state === CellState.SHIP)

  // In attack mode, hide enemy ship positions — show as empty water
  const displayState =
    mode === 'attack' && cell.state === CellState.SHIP ? CellState.EMPTY : cell.state

  const classes = cn(
    'grid-cell',
    `state-${displayState.toLowerCase()}`,
    isGhost && (isGhostValid ? 'ghost-valid' : 'ghost-invalid'),
    isPending && 'cell-pending',
    mode === 'defense' && 'mode-defense',
    mode === 'attack' && 'mode-attack',
    isInteractive && cell.state !== CellState.EMPTY && cell.state !== CellState.SHIP && 'already-fired',
    animClass
  )

  return (
    <div
      className={classes}
      data-testid={`cell-${row}-${col}`}
      role={canFire ? 'button' : undefined}
      tabIndex={canFire ? 0 : undefined}
      aria-label={canFire ? `Fire at ${String.fromCharCode(65 + col)}${row + 1}` : undefined}
      onClick={isInteractive ? onClick : undefined}
      onTouchStart={isInteractive ? onTouchStart : undefined}
      onMouseEnter={isInteractive ? onMouseEnter : undefined}
      onKeyDown={
        canFire
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.()
            }
          : undefined
      }
    >
      {STATE_ICONS[cell.state] && (
        <span className="cell-icon" aria-hidden="true">
          {STATE_ICONS[cell.state]}
        </span>
      )}
    </div>
  )
}
