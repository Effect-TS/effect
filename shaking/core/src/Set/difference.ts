import type { Eq } from "../Eq"
import { difference as difference_1 } from "../Readonly/Set"

/**
 * Form the set difference (`x` - `y`)
 *
 * @example
 * import { difference } from 'fp-ts/lib/Set'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 *
 *
 * @since 2.0.0
 */
export const difference: <A>(
  E: Eq<A>
) => (x: Set<A>, y: Set<A>) => Set<A> = difference_1 as any
