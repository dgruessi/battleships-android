export const GRID_SIZE = 10;

export const FLEET: { type: string; size: number }[] = [
  { type: "CARRIER", size: 5 },
  { type: "CRUISER", size: 4 },
  { type: "DESTROYER_A", size: 3 },
  { type: "DESTROYER_B", size: 3 },
  { type: "PATROL_BOAT", size: 2 },
];

export interface ShipPlacement {
  type: string;
  row: number;
  col: number;
  orientation: "HORIZONTAL" | "VERTICAL";
}

export function validatePlacement(ships: unknown): { valid: boolean; reason?: string } {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) {
    return { valid: false, reason: `Expected exactly ${FLEET.length} ships` };
  }

  const expectedTypes = FLEET.map((f) => f.type).sort().join(",");
  const actualTypes = (ships as ShipPlacement[]).map((s) => s.type).sort().join(",");
  if (expectedTypes !== actualTypes) {
    return { valid: false, reason: "Invalid fleet composition" };
  }

  const occupied = new Set<string>();
  for (const ship of ships as ShipPlacement[]) {
    const entry = FLEET.find((f) => f.type === ship.type);
    if (!entry) return { valid: false, reason: `Unknown ship type: ${ship.type}` };
    if (!["HORIZONTAL", "VERTICAL"].includes(ship.orientation)) {
      return { valid: false, reason: `Invalid orientation for ${ship.type}` };
    }

    for (const [r, c] of shipCells(ship, entry.size)) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return { valid: false, reason: `Ship ${ship.type} is out of bounds` };
      }
      const key = `${r},${c}`;
      if (occupied.has(key)) {
        return { valid: false, reason: `Ships overlap at cell ${key}` };
      }
      occupied.add(key);
    }
  }
  return { valid: true };
}

export function shipCells(p: ShipPlacement, size: number): [number, number][] {
  return Array.from({ length: size }, (_, i): [number, number] =>
    p.orientation === "HORIZONTAL" ? [p.row, p.col + i] : [p.row + i, p.col],
  );
}
