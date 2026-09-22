/**
 * `Hash.hash` results for objects, shared with `Equal` so it can read a cached
 * hash without the full dispatch.
 *
 * @internal
 */
export const hashCache = new WeakMap<object, number>()

/**
 * The number of back-edges `Hash.hash` has met. A hash computed while it
 * changed contains a circular sentinel and depends on where hashing started,
 * so it is never cached.
 *
 * @internal
 */
export let backEdges = 0

/** @internal */
export const addBackEdge = (): void => {
  backEdges++
}
