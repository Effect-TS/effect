import type { Eq } from "../../Eq"
import { getEq as getEq_1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @example
 * import { getEq, cons } from 'fp-ts/lib/ReadonlyNonEmptyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 2]), true)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 3]), false)
 *
 * @since 2.5.0
 */
export const getEq: <A>(E: Eq<A>) => Eq<ReadonlyNonEmptyArray<A>> = getEq_1
