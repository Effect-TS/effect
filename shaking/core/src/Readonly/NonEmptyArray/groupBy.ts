import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"
import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @example
 * import { cons, groupBy } from 'fp-ts/lib/ReadonlyNonEmptyArray'
 *
 * assert.deepStrictEqual(groupBy((s: string) => String(s.length))(['foo', 'bar', 'foobar']), {
 *   '3': cons('foo', ['bar']),
 *   '6': cons('foobar', [])
 * })
 *
 * @since 2.5.0
 */
export function groupBy<A>(
  f: (a: A) => string
): (as: ReadonlyArray<A>) => ReadonlyRecord<string, ReadonlyNonEmptyArray<A>> {
  return (as) => {
    const r: Record<string, NonEmptyArray<A>> = {}
    for (const a of as) {
      const k = f(a)
      // eslint-disable-next-line no-prototype-builtins
      if (r.hasOwnProperty(k)) {
        r[k].push(a)
      } else {
        r[k] = [a]
      }
    }
    return r
  }
}
