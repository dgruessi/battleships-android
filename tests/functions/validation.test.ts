import { describe, test, expect } from 'vitest'
import { validatePlacement } from '@functions/validation'

const VALID_FLEET = [
  { type: 'CARRIER',     row: 0, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'CRUISER',     row: 1, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'DESTROYER_A', row: 2, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'DESTROYER_B', row: 3, col: 0, orientation: 'HORIZONTAL' as const },
  { type: 'PATROL_BOAT', row: 4, col: 0, orientation: 'HORIZONTAL' as const },
]

describe('validatePlacement', () => {
  test('valid fleet passes', () => {
    expect(validatePlacement(VALID_FLEET).valid).toBe(true)
  })

  test('wrong count rejects', () => {
    const result = validatePlacement(VALID_FLEET.slice(0, 4))
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/5 ships/)
  })

  test('duplicate type rejects', () => {
    const fleet = [...VALID_FLEET]
    fleet[4] = { type: 'CARRIER', row: 5, col: 0, orientation: 'HORIZONTAL' }
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/fleet composition/)
  })

  test('out of bounds horizontal rejects', () => {
    const fleet = [...VALID_FLEET]
    // CARRIER size 5 at col 7 → cols 7,8,9,10,11 — col 10 and 11 out of bounds
    fleet[0] = { type: 'CARRIER', row: 0, col: 7, orientation: 'HORIZONTAL' }
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/out of bounds/)
  })

  test('out of bounds vertical rejects', () => {
    const fleet = [...VALID_FLEET]
    // CARRIER size 5 at row 7 → rows 7,8,9,10,11 — row 10 and 11 out of bounds
    fleet[0] = { type: 'CARRIER', row: 7, col: 0, orientation: 'VERTICAL' }
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/out of bounds/)
  })

  test('overlapping ships rejects', () => {
    const fleet = [...VALID_FLEET]
    // CRUISER at row 0 col 0 overlaps CARRIER at row 0 col 0
    fleet[1] = { type: 'CRUISER', row: 0, col: 0, orientation: 'HORIZONTAL' }
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/overlap/)
  })

  test('invalid orientation rejects', () => {
    const fleet = [...VALID_FLEET] as any[]
    fleet[0] = { type: 'CARRIER', row: 0, col: 0, orientation: 'DIAGONAL' }
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/orientation/)
  })

  test('non-array input rejects', () => {
    expect(validatePlacement(null).valid).toBe(false)
    expect(validatePlacement('hello').valid).toBe(false)
    expect(validatePlacement({}).valid).toBe(false)
    expect(validatePlacement(42).valid).toBe(false)
  })

  test('ships at right edge are valid', () => {
    // PATROL_BOAT size 2 at col 8 → cols 8,9 — just within bounds
    const fleet = [
      ...VALID_FLEET.slice(0, 4),
      { type: 'PATROL_BOAT', row: 5, col: 8, orientation: 'HORIZONTAL' as const },
    ]
    expect(validatePlacement(fleet).valid).toBe(true)
  })

  test('vertical ships at bottom edge are valid', () => {
    // PATROL_BOAT size 2 at row 8 → rows 8,9 — just within bounds
    const fleet = [
      ...VALID_FLEET.slice(0, 4),
      { type: 'PATROL_BOAT', row: 8, col: 5, orientation: 'VERTICAL' as const },
    ]
    expect(validatePlacement(fleet).valid).toBe(true)
  })

  test('ship exactly one cell out of bounds right rejects', () => {
    // PATROL_BOAT size 2 at col 9 → col 9 OK, col 10 OOB
    const fleet = [
      ...VALID_FLEET.slice(0, 4),
      { type: 'PATROL_BOAT', row: 5, col: 9, orientation: 'HORIZONTAL' as const },
    ]
    const result = validatePlacement(fleet)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/out of bounds/)
  })
})
