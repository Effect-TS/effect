import type { Foldable, Foldable1, Foldable2, Foldable3 } from "fp-ts/lib/Foldable"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

import type { Magma } from "../Magma"
import { fromFoldableMap as fromFoldableMap_1 } from "../Readonly/Record"

/**
 * Create a record from a foldable collection using the specified functions to
 *
 * - map to key/value pairs
 * - combine values for duplicate keys.
 *
 * @example
 * import { getLastSemigroup } from 'fp-ts/lib/Semigroup'
 * import { array, zip } from 'fp-ts/lib/Array'
 * import { identity } from 'fp-ts/lib/function'
 * import { fromFoldableMap } from 'fp-ts/lib/Record'
 *
 * // like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: Array<K>, values: Array<A>): Record<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), array)(zip(keys, values), identity)
 *
 * assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2, 3]), { a: 1, b: 2 })
 *
 * // build a record from a field
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * const users: Array<User> = [
 *   { id: 'id1', name: 'name1' },
 *   { id: 'id2', name: 'name2' },
 *   { id: 'id1', name: 'name3' }
 * ]
 *
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), array)(users, user => [user.id, user]), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 *
 * @since 2.0.0
 */

export function fromFoldableMap<F extends URIS3, B>(
  M: Magma<B>,
  F: Foldable3<F>
): <R, E, A, K extends string>(
  fa: Kind3<F, R, E, A>,
  f: (a: A) => [K, B]
) => Record<K, B>
export function fromFoldableMap<F extends URIS2, B>(
  M: Magma<B>,
  F: Foldable2<F>
): <E, A, K extends string>(fa: Kind2<F, E, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F extends URIS, B>(
  M: Magma<B>,
  F: Foldable1<F>
): <A, K extends string>(fa: Kind<F, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A, K extends string>(fa: HKT<F, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A>(fa: HKT<F, A>, f: (a: A) => [string, B]) => Record<string, B> {
  return fromFoldableMap_1(M, F)
}
