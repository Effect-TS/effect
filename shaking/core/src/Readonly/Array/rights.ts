import type { Either } from "../../Either/Either"

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @example
 * import { rights } from 'fp-ts/lib/ReadonlyArray'
 * import { right, left } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 *
 * @since 2.5.0
 */
export function rights<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> {
  // tslint:disable-next-line: readonly-array
  const r: Array<A> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]
    if (a._tag === "Right") {
      r.push(a.right)
    }
  }
  return r
}
