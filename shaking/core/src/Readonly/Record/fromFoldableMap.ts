import type { Foldable, Foldable1, Foldable2, Foldable3 } from "fp-ts/lib/Foldable"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

import type { Magma } from "../../Magma"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

/**
 * Create a record from a foldable collection using the specified functions to
 *
 * - map to key/value pairs
 * - combine values for duplicate keys.
 *
 * @example
 * import { getLastSemigroup } from 'fp-ts/lib/Semigroup'
 * import { readonlyArray, zip } from 'fp-ts/lib/ReadonlyArray'
 * import { identity } from 'fp-ts/lib/function'
 * import { ReadonlyRecord, fromFoldableMap } from 'fp-ts/lib/ReadonlyRecord'
 *
 * // like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: ReadonlyArray<K>, values: ReadonlyArray<A>): ReadonlyRecord<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), readonlyArray)(zip(keys, values), identity)
 *
 * assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2, 3]), { a: 1, b: 2 })
 *
 * // build a record from a field
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * const users: ReadonlyArray<User> = [
 *   { id: 'id1', name: 'name1' },
 *   { id: 'id2', name: 'name2' },
 *   { id: 'id1', name: 'name3' }
 * ]
 *
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), readonlyArray)(users, user => [user.id, user]), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 *
 * @since 2.5.0
 */

export function fromFoldableMap<F extends URIS3, B>(
  M: Magma<B>,
  F: Foldable3<F>
): <R, E, A, K extends string>(
  fa: Kind3<F, R, E, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap<F extends URIS2, B>(
  M: Magma<B>,
  F: Foldable2<F>
): <E, A, K extends string>(
  fa: Kind2<F, E, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap<F extends URIS, B>(
  M: Magma<B>,
  F: Foldable1<F>
): <A, K extends string>(
  fa: Kind<F, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A, K extends string>(
  fa: HKT<F, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A>(fa: HKT<F, A>, f: (a: A) => readonly [string, B]) => ReadonlyRecord<string, B> {
  return <A>(ta: HKT<F, A>, f: (a: A) => readonly [string, B]) => {
    return F.reduce<A, Record<string, B>>(ta, {}, (r, a) => {
      const [k, b] = f(a)
      r[k] = _hasOwnProperty.call(r, k) ? M.concat(r[k], b) : b
      return r
    })
  }
}
