// Seeded PRNG (mulberry32) — injectable for deterministic tests
export type RNG = () => number

export function createSeededRNG(seed: number): RNG {
  let s = seed >>> 0
  return function () {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createDefaultRNG(): RNG {
  return () => Math.random()
}

export function shuffle<T>(arr: T[], rng: RNG = createDefaultRNG()): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}

export function randomElement<T>(arr: T[], rng: RNG = createDefaultRNG()): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export function randomInt(min: number, max: number, rng: RNG = createDefaultRNG()): number {
  return Math.floor(rng() * (max - min + 1)) + min
}
