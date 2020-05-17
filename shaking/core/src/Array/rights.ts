import type { Either } from "../Either/Either"
import { rights as rights_1 } from "../Readonly/Array/rights"

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @example
 * import { rights } from 'fp-ts/lib/Array'
 * import { right, left } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 */
export const rights: <E, A>(as: Array<Either<E, A>>) => Array<A> = rights_1 as any
