import { describe, it, expect } from 'vitest'
import { toIndex, fromIndex, toAlgebraic, parseAlgebraic, isInBounds, coordsEqual } from '@/utils/coordinates'

describe('toIndex / fromIndex', () => {
  it('round-trips all 100 cells', () => {
    for (let i = 0; i < 100; i++) {
      expect(toIndex(fromIndex(i))).toBe(i)
    }
  })

  it('maps (0,0) to 0', () => expect(toIndex({ row: 0, col: 0 })).toBe(0))
  it('maps (0,9) to 9', () => expect(toIndex({ row: 0, col: 9 })).toBe(9))
  it('maps (1,0) to 10', () => expect(toIndex({ row: 1, col: 0 })).toBe(10))
  it('maps (9,9) to 99', () => expect(toIndex({ row: 9, col: 9 })).toBe(99))
})

describe('toAlgebraic / parseAlgebraic', () => {
  it('A1 == (0,0)', () => {
    expect(parseAlgebraic('A1')).toEqual({ row: 0, col: 0 })
    expect(toAlgebraic({ row: 0, col: 0 })).toBe('A1')
  })
  it('J10 == (9,9)', () => {
    expect(parseAlgebraic('J10')).toEqual({ row: 9, col: 9 })
    expect(toAlgebraic({ row: 9, col: 9 })).toBe('J10')
  })
  it('E5 == (4,4)', () => {
    expect(parseAlgebraic('E5')).toEqual({ row: 4, col: 4 })
    expect(toAlgebraic({ row: 4, col: 4 })).toBe('E5')
  })
})

describe('isInBounds', () => {
  it('accepts all cells within 0-9', () => {
    expect(isInBounds({ row: 0, col: 0 })).toBe(true)
    expect(isInBounds({ row: 9, col: 9 })).toBe(true)
    expect(isInBounds({ row: 5, col: 5 })).toBe(true)
  })
  it('rejects out-of-bounds', () => {
    expect(isInBounds({ row: -1, col: 0 })).toBe(false)
    expect(isInBounds({ row: 10, col: 0 })).toBe(false)
    expect(isInBounds({ row: 0, col: -1 })).toBe(false)
    expect(isInBounds({ row: 0, col: 10 })).toBe(false)
  })
})

describe('coordsEqual', () => {
  it('returns true for same coords', () => expect(coordsEqual({ row: 3, col: 4 }, { row: 3, col: 4 })).toBe(true))
  it('returns false for different coords', () => expect(coordsEqual({ row: 3, col: 4 }, { row: 3, col: 5 })).toBe(false))
})
