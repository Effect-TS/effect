import { dual } from "../Function.ts"

/** @internal */
export const symbol = "~effect/Hash"

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

/**
 * Hashes nested values for the `[Hash.symbol]` methods of runtime data types
 * (`Exit`, `Cause`, `Context`).
 *
 * Every fiber creates those values, so importing `Hash.ts` from them would put
 * the structural hash in every program that runs an effect. Instead
 * `Hash.hash` installs itself here before it calls a `[Hash.symbol]` method,
 * so hashes computed through `Hash.hash` are exactly the same as if the
 * methods imported it. A method called directly, before any `Hash.hash`
 * dispatch, hashes every nested value to the same constant, which agrees with
 * any equality.
 *
 * @internal
 */
export let hash: (self: unknown) => number = () => 0

/** @internal */
export const installHash = (f: (self: unknown) => number): void => {
  hash = f
}

/**
 * 32-bit MurmurHash3 finalizer.
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

/** @internal */
export const combine: {
  (b: number): (self: number) => number
  (self: number, b: number): number
} = dual(2, (self: number, b: number): number => mix(Math.imul(self, 0x9e3779b1) + Math.imul(b, 0x85ebca6b)))

/** @internal */
export const optimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

const float64 = new DataView(new ArrayBuffer(8))

/** @internal */
export const number = (n: number): number => {
  const h = n | 0
  if (h === n) {
    return optimize(h)
  }
  float64.setFloat64(0, n !== n ? NaN : n)
  return optimize(combine(float64.getInt32(0), float64.getInt32(4)))
}

/** @internal */
export const string = (str: string): number => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return optimize(h)
}

/** @internal */
export const array = <A>(arr: Iterable<A>): number => {
  let h = 6151
  for (const element of arr) {
    h = combine(h, hash(element))
  }
  return optimize(h)
}
