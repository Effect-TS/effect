import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { isOutOfBound } from "./isOutOfBound"
import { unsafeUpdateAt } from "./unsafeUpdateAt"

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @example
 * import { modifyAt } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 *
 * @since 2.5.0
 */
export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt(i, f(as[i]), as)))
}
