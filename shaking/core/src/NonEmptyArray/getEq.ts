import type { Eq } from "../Eq"
import { getEq as getEq_1 } from "../Readonly/NonEmptyArray/getEq"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @example
 * import { getEq, cons } from 'fp-ts/lib/NonEmptyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 2]), true)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 3]), false)
 *
 * @since 2.0.0
 */
export const getEq: <A>(E: Eq<A>) => Eq<NonEmptyArray<A>> = getEq_1
