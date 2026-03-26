import { ShipDefinition } from '@/constants/ships'
import { Orientation } from '@/constants/game'
import { cn } from '@/utils/cn'
import './ShipToken.css'

interface ShipTokenProps {
  definition: ShipDefinition
  orientation: Orientation
  isSelected?: boolean
  isPlaced?: boolean
  onClick?: () => void
}

export default function ShipToken({
  definition,
  orientation,
  isSelected,
  isPlaced,
  onClick,
}: ShipTokenProps) {
  return (
    <button
      type="button"
      className={cn(
        'ship-token',
        `orientation-${orientation.toLowerCase()}`,
        isSelected && 'selected',
        isPlaced && 'placed'
      )}
      data-testid={`ship-${definition.id}`}
      onClick={onClick}
      disabled={isPlaced}
      aria-label={`${definition.name} (${definition.size} cells)${isPlaced ? ' — placed' : ''}`}
      aria-pressed={isSelected}
    >
      <span className="ship-token-label">{definition.name}</span>
      <div className="ship-token-cells">
        {Array.from({ length: definition.size }, (_, i) => (
          <div
            key={i}
            className={cn(
              'ship-token-cell',
              i === 0 && 'head',
              i === definition.size - 1 && 'tail',
              i > 0 && i < definition.size - 1 && 'body'
            )}
          />
        ))}
      </div>
      <span className="ship-token-size">{definition.size}</span>
    </button>
  )
}
