import { SHIP_DEFINITIONS } from '@/constants/ships'
import { Orientation } from '@/constants/game'
import { PlacedShip } from '@/models/types'
import ShipToken from '@/components/ship/ShipToken'
import './ShipDock.css'

interface ShipDockProps {
  placedShips: PlacedShip[]
  selectedShipId: string | null
  orientation: Orientation
  onSelectShip: (id: string) => void
}

export default function ShipDock({
  placedShips,
  selectedShipId,
  orientation,
  onSelectShip,
}: ShipDockProps) {
  const placedIds = new Set(placedShips.map((s) => s.definition.id))

  return (
    <div className="ship-dock" data-testid="ship-dock">
      <div className="ship-dock-title">FLEET</div>
      <div className="ship-dock-list">
        {SHIP_DEFINITIONS.map((def) => (
          <ShipToken
            key={def.id}
            definition={def}
            orientation={orientation}
            isSelected={selectedShipId === def.id}
            isPlaced={placedIds.has(def.id)}
            onClick={() => {
              if (!placedIds.has(def.id)) onSelectShip(def.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
