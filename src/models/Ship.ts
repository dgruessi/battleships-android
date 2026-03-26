/**
 * Ship model — sprite sheet data for fleet_assets.png (1514×704).
 *
 * The sheet has 4 rows of equal height (176px per row):
 *   Row 0: Träger           (5 cells) — spriteX=0,   spriteY=0
 *   Row 1: Kreuzer          (4 cells) — spriteX=0,   spriteY=176
 *   Row 2: Zerstörer        (3 cells) — spriteX=0,   spriteY=352
 *   Row 3a: U-Boot          (3 cells) — spriteX=0,   spriteY=528
 *   Row 3b: Patrouillenboot (2 cells) — spriteX=528, spriteY=528
 *
 * Natural cell size in the sprite sheet: 176×176 px.
 * Scale factor at runtime: cellSize / SPRITE_SHEET.rowH
 */

export interface ShipSpriteData {
  /** Left edge of this ship's sprite in the PNG (px) */
  spriteX: number
  /** Top edge of this ship's sprite row in the PNG (px) */
  spriteY: number
}

/** Full sprite sheet geometry */
export const SPRITE_SHEET = {
  totalW: 1514,
  totalH: 704,
  /** Height of one ship row = natural height of one grid cell in the sheet */
  rowH: 176,
} as const

/** Maps ship definition IDs → sprite coordinates */
export const SHIP_SPRITE_DATA: Record<string, ShipSpriteData> = {
  carrier:      { spriteX: 0,   spriteY: 0   },
  battleship:   { spriteX: 0,   spriteY: 176 },
  cruiser:      { spriteX: 0,   spriteY: 352 },
  submarine:    { spriteX: 0,   spriteY: 528 },
  destroyer:    { spriteX: 528, spriteY: 528 },
}

export function getShipSprite(shipId: string): ShipSpriteData | null {
  return SHIP_SPRITE_DATA[shipId] ?? null
}
