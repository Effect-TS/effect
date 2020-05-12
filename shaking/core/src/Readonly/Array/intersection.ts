import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { intersection } from 'fp-ts/lib/ReadonlyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(intersection(eqNumber)([1, 2], [2, 3]), [2])
 *
 * @since 2.5.0
 */
export function intersection<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem(E)
  return (xs, ys) => xs.filter((a) => elemE(a, ys))
}
