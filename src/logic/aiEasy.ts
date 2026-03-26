import { GRID_SIZE } from '@/constants/grid'
import { AIState, Coordinate } from '@/models/types'
import { fromIndex } from '@/utils/coordinates'
import { shuffle, RNG, createDefaultRNG } from '@/utils/random'

export function getEasyMove(aiState: AIState, rng: RNG = createDefaultRNG()): Coordinate {
  const all = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)
  const candidates = all.filter((i) => !aiState.shotHistory.has(i))
  const shuffled = shuffle(candidates, rng)
  return fromIndex(shuffled[0]!)
}
