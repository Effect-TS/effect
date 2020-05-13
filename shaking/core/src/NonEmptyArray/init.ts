import { init as init_1 } from "../Readonly/NonEmptyArray/init"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @example
 * import { init } from 'fp-ts/lib/NonEmptyArray'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
 * assert.deepStrictEqual(init([1]), [])
 *
 * @since 2.2.0
 */
export const init: <A>(nea: NonEmptyArray<A>) => Array<A> = init_1 as any
