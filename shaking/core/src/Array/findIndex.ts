import type { Predicate } from "../Function"
import type { Option } from "../Option/Option"
import { findIndex as findIndex_1 } from "../Readonly/Array/findIndex"

/**
 * Find the first index for which a predicate holds
 *
 * @example
 * import { findIndex } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([1, 2, 3]), some(1))
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([]), none)
 */
export const findIndex: <A>(
  predicate: Predicate<A>
) => (as: Array<A>) => Option<number> = findIndex_1
