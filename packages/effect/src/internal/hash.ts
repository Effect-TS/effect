// Hash composition primitives, shared by `Hash` and Effect's collections.
//
// Leaf hashes stay as cheap as possible (small integers are their own hash).
// Avalanche is applied where hashes are composed instead: folding raw leaf
// hashes with linear operations (XOR, multiply-add) loses information, e.g. a
// record `{ x, y }` of small integers would hash to `c ^ x ^ y`. The mixing
// steps are MurmurHash3's (Austin Appleby, public domain).

/** @internal */
export const optimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

/**
 * MurmurHash3 `fmix32` finalizer: a bijective avalanche over 32 bits.
 *
 * @internal
 */
export const mix = (h: number): number => {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return h ^ (h >>> 16)
}

const rotl = (x: number, r: number): number => (x << r) | (x >>> (32 - r))

/**
 * MurmurHash3 block scramble: spreads a value over all bits before merging.
 *
 * @internal
 */
export const scramble = (k: number): number => Math.imul(rotl(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593)

/**
 * Ordered composition (arrays): the MurmurHash3 body step, so position matters
 * and repeated elements do not cancel.
 *
 * @internal
 */
export const combineOrdered = (h: number, element: number): number =>
  (Math.imul(rotl(h ^ scramble(element), 13), 5) + 0xe6546b64) | 0

/** @internal */
export const finishOrdered = (h: number, length: number): number => optimize(mix(h ^ length))

/**
 * Unordered composition (records, maps): each entry becomes an independently
 * mixed term, XOR-folded by the caller so iteration order does not matter. The
 * value is scrambled before meeting the key so that entries under different
 * keys cannot trade places.
 *
 * @internal
 */
export const entryTerm = (key: number, value: number): number => mix(key ^ scramble(value))

/**
 * Unordered composition (sets): each element becomes an independently mixed
 * term, XOR-folded by the caller.
 *
 * @internal
 */
export const elementTerm: (element: number) => number = mix

/**
 * Fixed sentinel hashes, well distributed rather than derived from strings.
 *
 * @internal
 */
export const tag = (n: number): number => optimize(mix(n))
