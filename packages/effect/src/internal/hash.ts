/**
 * Back-edge count used to avoid caching entry-point-dependent hashes and
 * comparisons.
 *
 * @internal
 */
export let backEdges = 0

/** @internal */
export const addBackEdge = (): void => {
  backEdges++
}

/** @internal */
export const hashCache = new WeakMap<object, number>()

// 32-bit MurmurHash3 finalizer.
/** @internal */
export const mix = (h: number): number => {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return h ^ (h >>> 16)
}

/**
 * Data-first `Hash.combine`. The hash methods of the runtime's own data types
 * use it, so running an effect does not require `Function.dual`.
 *
 * @internal
 */
export const combine = (self: number, b: number): number => mix(Math.imul(self, 0x9e3779b1) + Math.imul(b, 0x85ebca6b))
