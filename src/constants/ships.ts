export interface ShipDefinition {
  id: string
  name: string
  size: number
}

export const SHIP_DEFINITIONS: ShipDefinition[] = [
  { id: 'carrier',    name: 'Träger',          size: 5 },
  { id: 'battleship', name: 'Kreuzer',          size: 4 },
  { id: 'cruiser',    name: 'Zerstörer',        size: 3 },
  { id: 'submarine',  name: 'U-Boot',           size: 3 },
  { id: 'destroyer',  name: 'Patrouillenboot',  size: 2 },
]
