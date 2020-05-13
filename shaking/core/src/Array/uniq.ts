import type { Eq } from "../Eq"
import { uniq as uniq_1 } from "../Readonly/Array/uniq"

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @example
 * import { uniq } from 'fp-ts/lib/Array'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(uniq(eqNumber)([1, 2, 1]), [1, 2])
 *
 * @since 2.0.0
 */
export const uniq: <A>(E: Eq<A>) => (as: Array<A>) => Array<A> = uniq_1 as any
