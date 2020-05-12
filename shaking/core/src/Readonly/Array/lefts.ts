import type { Either } from "../../Either/Either"

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * @example
 * import { lefts } from 'fp-ts/lib/ReadonlyArray'
 * import { left, right } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 *
 * @since 2.5.0
 */
export function lefts<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> {
  // tslint:disable-next-line: readonly-array
  const r: Array<E> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]
    if (a._tag === "Left") {
      r.push(a.left)
    }
  }
  return r
}
