import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"

import { snoc as snoc_1 } from "../Readonly/Array/snoc"

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc: <A>(init: Array<A>, end: A) => NonEmptyArray<A> = snoc_1 as any
