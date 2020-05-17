import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"

import { cons as cons_1 } from "../Readonly/Array/cons"

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(cons(0, [1, 2, 3]), [0, 1, 2, 3])
 *
 */
export const cons: <A>(head: A, tail: Array<A>) => NonEmptyArray<A> = cons_1 as any
