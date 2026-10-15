/**
 * Deterministic randomness for tests and replayable deals.
 *
 * `seedRandom(seed)` returns a `rng(max)` in the same shape as
 * `crypto.randomInt`, so it can be dropped straight into `shuffleDeck`.
 */

/** mulberry32: small, fast, and stable across platforms for a given seed. */
export function mulberry32(seed) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A `crypto.randomInt`-shaped generator drawing from a seeded stream. */
export function seedRandom(seed) {
  const next = mulberry32(seed)
  return function rng(max) {
    const bound = Number(max)
    if (!Number.isFinite(bound) || bound <= 0) return 0
    return Math.min(bound - 1, Math.floor(next() * bound))
  }
}

/** A short, human-shareable code from the unambiguous alphabet. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function randomCode(length = 6, rng = null) {
  const draw = rng || ((max) => Math.floor(Math.random() * max))
  let out = ''
  for (let index = 0; index < length; index += 1) out += CODE_ALPHABET[draw(CODE_ALPHABET.length)]
  return out
}
