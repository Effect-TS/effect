import type { Either } from "../Either/Either"
import { lefts as lefts_1 } from "../Readonly/Array/lefts"

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * @example
 * import { lefts } from 'fp-ts/lib/Array'
 * import { left, right } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 *
 * @since 2.0.0
 */
export const lefts: <E, A>(as: Array<Either<E, A>>) => Array<E> = lefts_1 as any
