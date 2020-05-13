import { groupBy as groupBy_1 } from "../Readonly/NonEmptyArray/groupBy"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @example
 * import { cons, groupBy } from 'fp-ts/lib/NonEmptyArray'
 *
 * assert.deepStrictEqual(groupBy((s: string) => String(s.length))(['foo', 'bar', 'foobar']), {
 *   '3': cons('foo', ['bar']),
 *   '6': cons('foobar', [])
 * })
 *
 * @since 2.0.0
 */
export const groupBy: <A>(
  f: (a: A) => string
) => (as: Array<A>) => Record<string, NonEmptyArray<A>> = groupBy_1 as any
