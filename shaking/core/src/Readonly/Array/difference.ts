import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { difference } from 'fp-ts/lib/ReadonlyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)([1, 2], [2, 3]), [1])
 *
 * @since 2.5.0
 */
export function difference<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem(E)
  return (xs, ys) => xs.filter((a) => !elemE(a, ys))
}
