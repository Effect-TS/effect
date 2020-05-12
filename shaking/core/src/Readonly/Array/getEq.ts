import type { Eq } from "../../Eq"

/**
 * Derives an `Eq` over the `ReadonlyArray` of a given element type from the `Eq` of that type. The derived `Eq` defines two
 * arrays as equal if all elements of both arrays are compared equal pairwise with the given `E`. In case of arrays of
 * different lengths, the result is non equality.
 *
 * @example
 * import { eqString } from 'fp-ts/lib/Eq'
 * import { getEq } from 'fp-ts/lib/ReadonlyArray'
 *
 * const E = getEq(eqString)
 * assert.strictEqual(E.equals(['a', 'b'], ['a', 'b']), true)
 * assert.strictEqual(E.equals(['a'], []), false)
 *
 * @since 2.5.0
 */
export function getEq<A>(E: Eq<A>): Eq<ReadonlyArray<A>> {
  return {
    equals: (xs, ys) =>
      xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals(x, ys[i])))
  }
}
