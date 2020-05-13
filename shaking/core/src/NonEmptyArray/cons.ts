import { cons as cons_1 } from "../Readonly/NonEmptyArray/cons"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from 'fp-ts/lib/NonEmptyArray'
 *
 * assert.deepStrictEqual(cons(1, [2, 3, 4]), [1, 2, 3, 4])
 *
 * @since 2.0.0
 */
export const cons: <A>(head: A, tail: Array<A>) => NonEmptyArray<A> = cons_1 as any
