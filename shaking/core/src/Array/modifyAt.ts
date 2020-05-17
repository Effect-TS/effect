import type { Option } from "../Option/Option"
import { modifyAt as modifyAt_1 } from "../Readonly/Array/modifyAt"

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @example
 * import { modifyAt } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 */
export const modifyAt: <A>(
  i: number,
  f: (a: A) => A
) => (as: Array<A>) => Option<Array<A>> = modifyAt_1 as any
