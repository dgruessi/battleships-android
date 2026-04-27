import { FLEET, ShipPlacement, shipCells } from "./validation";

export type CellState = "UNKNOWN" | "EMPTY" | "HIT" | "SUNK";

export interface ShotResult {
  outcome: "MISS" | "HIT" | "SUNK";
  sunkShipType?: string;
  isWinner: boolean;
  updatedBoard: CellState[][];
}

/**
 * Processes a shot at (row, col) against [placements] given the current [board].
 * Returns the outcome and the mutated board (new array — no mutation in place).
 */
export function processShot(
  row: number,
  col: number,
  placements: ShipPlacement[],
  board: CellState[][],
): ShotResult {
  // Deep copy so callers can diff before/after
  const updated: CellState[][] = board.map((r) => [...r]);

  const hitShip = placements.find((ship) => {
    const entry = FLEET.find((f) => f.type === ship.type)!;
    return shipCells(ship, entry.size).some(([r, c]) => r === row && c === col);
  });

  if (!hitShip) {
    updated[row][col] = "EMPTY";
    return { outcome: "MISS", isWinner: false, updatedBoard: updated };
  }

  updated[row][col] = "HIT";

  const entry = FLEET.find((f) => f.type === hitShip.type)!;
  const allCells = shipCells(hitShip, entry.size);
  const isSunk = allCells.every(([r, c]) => updated[r][c] === "HIT" || updated[r][c] === "SUNK");

  if (isSunk) {
    for (const [r, c] of allCells) updated[r][c] = "SUNK";

    const isWinner = placements.every((ship) => {
      const fe = FLEET.find((f) => f.type === ship.type)!;
      return shipCells(ship, fe.size).every(([r, c]) => updated[r][c] === "SUNK");
    });

    return { outcome: "SUNK", sunkShipType: hitShip.type, isWinner, updatedBoard: updated };
  }

  return { outcome: "HIT", isWinner: false, updatedBoard: updated };
}
