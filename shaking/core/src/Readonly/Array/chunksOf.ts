import { chop } from "./chop"
import { empty } from "./empty"
import { isOutOfBound } from "./isOutOfBound"
import { splitAt } from "./splitAt"

/**
 * Splits an array into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the array. Note that `chunksOf(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
 * definition of `chunksOf`; it satisfies the property that
 *
 * ```ts
 * chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))
 * ```
 *
 * whenever `n` evenly divides the length of `xs`.
 *
 * @example
 * import { chunksOf } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
 *
 *
 * @since 2.5.0
 */
export function chunksOf(
  n: number
): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  const f = chop(splitAt(n))
  return (as) => (as.length === 0 ? empty : isOutOfBound(n - 1, as) ? [as] : f(as))
}
