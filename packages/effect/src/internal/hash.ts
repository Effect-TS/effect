import type * as Hash from "../Hash.ts"

/** @internal */
export const symbol = "~effect/Hash"

/**
 * The functions of `Hash.ts` used by the `[Hash.symbol]` methods of the data
 * types every fiber creates (`Exit`, `Cause` and `Context`).
 *
 * `Hash.ts` provides them, see `provideHashing`, for the same reason
 * `Equal.ts` provides `equals` in `internal/equal.ts`.
 *
 * @internal
 */
export let hash: typeof Hash.hash
/** @internal */
export let combine: typeof Hash.combine
/** @internal */
export let string: typeof Hash.string
/** @internal */
export let number: typeof Hash.number
/** @internal */
export let array: typeof Hash.array

/**
 * Provides the functions above and returns the key of the methods that use
 * them. `Hash.ts` initializes `Hash.symbol` with this call, like `Equal.ts`
 * does with `provideEquals`.
 *
 * @internal
 */
export const provideHashing = (
  hashing: Pick<typeof Hash, "hash" | "combine" | "string" | "number" | "array">
): typeof symbol => {
  ;({ hash, combine, string, number, array } = hashing)
  return symbol
}

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
