import { useState, useCallback, useRef } from 'react'
import { GRID_SIZE } from '@/constants/grid'
import { CellState } from '@/constants/game'
import { BoardState, Coordinate } from '@/models/types'
import { toIndex } from '@/utils/coordinates'
import { useCellSize } from '@/hooks/useCellSize'
import GridCell from '@/components/grid/GridCell'
import GridCoordinates from '@/components/grid/GridCoordinates'
import GridShip from '@/components/grid/GridShip'
import './GridBoard.css'

interface GridBoardProps {
  board: BoardState
  mode: 'placement' | 'defense' | 'attack'
  isActive?: boolean
  onCellClick?: (coord: Coordinate) => void
  onCellHover?: (coord: Coordinate | null) => void
  ghostCells?: Set<number>
  ghostValid?: boolean
  pendingCell?: number
  label?: string
  labelColor?: string
  'data-testid'?: string
}

export default function GridBoard({
  board,
  mode,
  isActive = false,
  onCellClick,
  onCellHover,
  ghostCells,
  ghostValid,
  pendingCell,
  label,
  labelColor,
  'data-testid': testId,
}: GridBoardProps) {
  const [animCells, setAnimCells] = useState<Map<number, string>>(new Map())
  const alreadyFiredRef = useRef<number | null>(null)
  const gridCellsRef = useRef<HTMLDivElement>(null)
  const cellSize = useCellSize(gridCellsRef)

  const handleClick = useCallback(
    (coord: Coordinate) => {
      const idx = toIndex(coord)
      const cell = board.grid[idx]
      if (!cell) return

      if (
        cell.state === CellState.HIT ||
        cell.state === CellState.MISS ||
        cell.state === CellState.SUNK
      ) {
        // Already fired — show brief gold pulse
        alreadyFiredRef.current = idx
        setAnimCells((prev) => new Map(prev).set(idx, 'anim-already-fired'))
        setTimeout(() => {
          setAnimCells((prev) => {
            const next = new Map(prev)
            next.delete(idx)
            return next
          })
          alreadyFiredRef.current = null
        }, 300)
        return
      }

      onCellClick?.(coord)
    },
    [board.grid, onCellClick]
  )

  // Show ship sprites: all ships on own board; only sunk ships on enemy board
  const shipsToShow =
    mode === 'placement' || mode === 'defense'
      ? board.ships
      : board.ships.filter((s) => s.isSunk)

  return (
    <div
      className={`grid-board-wrapper${isActive ? ' grid-board-active' : ''}`}
      data-testid={testId}
    >
      {label && (
        <div
          className="grid-board-label"
          style={{ color: labelColor ?? 'var(--color-text-secondary)' }}
        >
          {label}
        </div>
      )}
      <div className="grid-board-area">
        <GridCoordinates position="top" />
        <div className="grid-board-rows">
          <GridCoordinates position="left" />
          <div
            ref={gridCellsRef}
            className="grid-cells"
            onMouseLeave={() => onCellHover?.(null)}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
              const row = Math.floor(idx / GRID_SIZE)
              const col = idx % GRID_SIZE
              const coord: Coordinate = { row, col }
              const cell = board.grid[idx]!
              const isGhost = ghostCells?.has(idx) ?? false
              const isPending = pendingCell === idx

              return (
                <GridCell
                  key={idx}
                  cell={cell}
                  row={row}
                  col={col}
                  mode={mode}
                  isGhost={isGhost}
                  isGhostValid={ghostValid}
                  isPending={isPending}
                  animClass={animCells.get(idx)}
                  onClick={() => handleClick(coord)}
                  onTouchStart={() => handleClick(coord)}
                  onMouseEnter={() => onCellHover?.(coord)}
                />
              )
            })}

            {/* Ship sprites — z-index:1 so hit/miss markers appear above */}
            {shipsToShow.map((ship) => (
              <GridShip
                key={ship.definition.id}
                ship={ship}
                cellSize={cellSize}
                gap={1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
