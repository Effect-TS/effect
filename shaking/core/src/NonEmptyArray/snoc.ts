import { snoc as snoc_1 } from "../Readonly/NonEmptyArray/snoc"

import type { NonEmptyArray } from "./NonEmptyArray"
/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from 'fp-ts/lib/NonEmptyArray'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 *
 * @since 2.0.0
 */
export const snoc: <A>(init: Array<A>, end: A) => NonEmptyArray<A> = snoc_1 as any
