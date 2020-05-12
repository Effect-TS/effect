import type { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(cons(0, [1, 2, 3]), [0, 1, 2, 3])
 *
 * @since 2.5.0
 */
export function cons<A>(head: A, tail: ReadonlyArray<A>): ReadonlyNonEmptyArray<A> {
  const len = tail.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i + 1] = tail[i]
  }
  r[0] = head
  return (r as unknown) as ReadonlyNonEmptyArray<A>
}
