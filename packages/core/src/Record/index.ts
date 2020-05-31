/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CApplicative,
  CApplicative1,
  CApplicative2,
  CApplicative2C,
  CApplicative3,
  CApplicative3C,
  CApplicative4,
  CApplicative4MA,
  CApplicative4MAC,
  CApplicative4MAP,
  CApplicative4MAPC,
  CCompactable1,
  CFilterableWithIndex1,
  CFoldable,
  CFoldable1,
  CFoldable2,
  CFoldable3,
  CFoldableWithIndex1,
  CFunctorWithIndex1,
  CTraversableWithIndex1,
  CUnfoldable,
  CUnfoldable1,
  CWitherable1,
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  MaURIS,
  PredicateWithIndex,
  RefinementWithIndex,
  Separated,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  FunctorWithIndex1,
  Foldable1,
  TraversableWithIndex1,
  Compactable1,
  FilterableWithIndex1,
  Witherable1,
  FoldableWithIndex1,
  Applicative4EP,
  Applicative4E,
  Applicative4ECP,
  Applicative4EC,
  Applicative4,
  Applicative3,
  Applicative3C,
  Applicative2,
  Applicative2C,
  Applicative1,
  Applicative,
  CTraversable1
} from "../Base"
import type { Either } from "../Either"
import { Eq, fromEquals } from "../Eq"
import { flow, identity, Predicate, Refinement } from "../Function"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import { isNone, isSome, none, Option, some as some_1 } from "../Option"
import { pipe } from "../Pipe"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export type ReadonlyRecord<K extends string, T> = Readonly<Record<K, T>>

export const URI = "@matechs/core/Record"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: ReadonlyRecord<string, A>
  }
}

export function fromRecord<K extends string, A>(r: Record<K, A>): ReadonlyRecord<K, A> {
  return Object.assign({}, r)
}

export function toRecord<K extends string, A>(r: ReadonlyRecord<K, A>): Record<K, A> {
  return Object.assign({}, r)
}

export function getShow<A>(S: Show<A>): Show<ReadonlyRecord<string, A>> {
  return {
    show: (r) => {
      const elements = collect((k, a: A) => `${JSON.stringify(k)}: ${S.show(a)}`)(
        r
      ).join(", ")
      return elements === "" ? "{}" : `{ ${elements} }`
    }
  }
}

/**
 * Calculate the number of key/value pairs in a record
 */
export function size(r: ReadonlyRecord<string, unknown>): number {
  return Object.keys(r).length
}

/**
 * Test whether a record is empty
 */
export function isEmpty(r: ReadonlyRecord<string, unknown>): boolean {
  return Object.keys(r).length === 0
}

export function keys<K extends string>(
  r: ReadonlyRecord<K, unknown>
): ReadonlyArray<K> {
  return (Object.keys(r) as any).sort()
}

/**
 * Map a record into an array
 *
 * @example
 * import {collect} from '@matechs/core/Record'
 *
 * const x: { a: string, b: boolean } = { a: 'foo', b: false }
 * assert.deepStrictEqual(
 *   collect((key, val) => ({key: key, value: val}))(x),
 *   [{key: 'a', value: 'foo'}, {key: 'b', value: false}]
 * )
 */
export function collect<K extends string, A, B>(
  f: (k: K, a: A) => B
): (r: ReadonlyRecord<K, A>) => ReadonlyArray<B> {
  return (r) => {
    const out: Array<B> = []
    for (const key of keys(r)) {
      out.push(f(key, r[key]))
    }
    return out
  }
}

export function collect_<K extends string, A, B>(
  r: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => B
): ReadonlyArray<B> {
  const out: Array<B> = []
  for (const key of keys(r)) {
    out.push(f(key, r[key]))
  }
  return out
}

/**
 * Insert or replace a key/value pair in a record
 */
export function insertAt<K extends string, A>(
  k: K,
  a: A
): <KS extends string>(r: ReadonlyRecord<KS, A>) => ReadonlyRecord<KS | K, A>
export function insertAt<A>(
  k: string,
  a: A
): (r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (r) => {
    if (r[k] === a) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    out[k] = a
    return out
  }
}

export function insertAt_<KS extends string, K extends string, A>(
  r: ReadonlyRecord<KS, A>,
  k: K,
  a: A
): ReadonlyRecord<KS | K, A>
export function insertAt_<A>(
  r: ReadonlyRecord<string, A>,
  k: string,
  a: A
): ReadonlyRecord<string, A> {
  if (r[k] === a) {
    return r
  }
  const out: Record<string, A> = Object.assign({}, r)
  out[k] = a
  return out
}

export function hasOwnProperty<K extends string>(
  k: string,
  r: ReadonlyRecord<K, unknown>
): k is K {
  return Object.prototype.hasOwnProperty.call(r, k)
}

/**
 * Delete a key and value from a map
 */
export function deleteAt<K extends string>(
  k: K
): <KS extends string, A>(
  r: ReadonlyRecord<KS, A>
) => ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt(
  k: string
): <A>(r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return <A>(r: ReadonlyRecord<string, A>) => {
    if (!Object.prototype.hasOwnProperty.call(r, k)) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    delete out[k]
    return out
  }
}

export function deleteAt_<KS extends string, A, K extends string>(
  r: ReadonlyRecord<KS, A>,
  k: K
): ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt_<A>(
  r: ReadonlyRecord<string, A>,
  k: string
): ReadonlyRecord<string, A> {
  if (!Object.prototype.hasOwnProperty.call(r, k)) {
    return r
  }
  const out: Record<string, A> = Object.assign({}, r)
  delete out[k]
  return out
}

export function updateAt<A>(
  k: string,
  a: A
): <K extends string>(r: ReadonlyRecord<K, A>) => Option<ReadonlyRecord<K, A>> {
  return <K extends string>(r: ReadonlyRecord<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    if (r[k] === a) {
      return some_1(r)
    }
    const out: Record<K, A> = Object.assign({}, r)
    out[k] = a
    return some_1(out)
  }
}

export function updateAt_<K extends string, A>(
  r: ReadonlyRecord<K, A>,
  k: string,
  a: A
): Option<ReadonlyRecord<K, A>> {
  if (!hasOwnProperty(k, r)) {
    return none
  }
  if (r[k] === a) {
    return some_1(r)
  }
  const out: Record<K, A> = Object.assign({}, r)
  out[k] = a
  return some_1(out)
}

export function modifyAt<A>(
  k: string,
  f: (a: A) => A
): <K extends string>(r: ReadonlyRecord<K, A>) => Option<ReadonlyRecord<K, A>> {
  return <K extends string>(r: ReadonlyRecord<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    const out: Record<K, A> = Object.assign({}, r)
    out[k] = f(r[k])
    return some_1(out)
  }
}

export function modifyAt_<K extends string, A>(
  r: ReadonlyRecord<K, A>,
  k: string,
  f: (a: A) => A
): Option<ReadonlyRecord<K, A>> {
  if (!hasOwnProperty(k, r)) {
    return none
  }
  const out: Record<K, A> = Object.assign({}, r)
  out[k] = f(r[k])
  return some_1(out)
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop<K extends string>(
  k: K
): <KS extends string, A>(
  r: ReadonlyRecord<KS, A>
) => Option<readonly [A, ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>]>
export function pop(
  k: string
): <A>(
  r: ReadonlyRecord<string, A>
) => Option<readonly [A, ReadonlyRecord<string, A>]> {
  const deleteAtk = deleteAt(k)
  return (r) => {
    const oa = lookup_(r, k)
    return isNone(oa) ? none : some_1([oa.value, deleteAtk(r)])
  }
}

export function pop_<KS extends string, A, K extends string>(
  r: ReadonlyRecord<KS, A>,
  k: K
): Option<readonly [A, ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>]>
export function pop_<A>(
  r: ReadonlyRecord<string, A>,
  k: string
): Option<readonly [A, ReadonlyRecord<string, A>]> {
  const deleteAtk = deleteAt(k)
  const oa = lookup_(r, k)
  return isNone(oa) ? none : some_1([oa.value, deleteAtk(r)])
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export function isSubrecord_<A>(
  E: Eq<A>
): (x: ReadonlyRecord<string, A>, y: ReadonlyRecord<string, A>) => boolean {
  return (x, y) => {
    for (const k in x) {
      if (!Object.prototype.hasOwnProperty.call(y, k) || !E.equals(x[k], y[k])) {
        return false
      }
    }
    return true
  }
}

export function isSubrecord<A>(
  E: Eq<A>
): (y: ReadonlyRecord<string, A>) => (x: ReadonlyRecord<string, A>) => boolean {
  return (y) => (x) => {
    for (const k in x) {
      if (!Object.prototype.hasOwnProperty.call(y, k) || !E.equals(x[k], y[k])) {
        return false
      }
    }
    return true
  }
}

export function getEq<K extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<K, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> {
  const isSubrecordE = isSubrecord_(E)
  return fromEquals((x, y) => isSubrecordE(x, y) && isSubrecordE(y, x))
}

/**
 * Returns a `Semigroup` instance for records given a `Semigroup` instance for their values
 *
 * @example
 * import { semigroupSum } from '@matechs/core/Semigroup'
 * import { getMonoid } from '@matechs/core/Record'
 *
 * const M = getMonoid(semigroupSum)
 * assert.deepStrictEqual(M.concat({ foo: 123 }, { foo: 456 }), { foo: 579 })
 */
export function getMonoid<K extends string, A>(
  S: Semigroup<A>
): Monoid<ReadonlyRecord<K, A>>
export function getMonoid<A>(S: Semigroup<A>): Monoid<ReadonlyRecord<string, A>> {
  return {
    concat: (x, y) => {
      if (x === empty) {
        return y
      }
      if (y === empty) {
        return x
      }
      const keys = Object.keys(y)
      const len = keys.length
      if (len === 0) {
        return x
      }
      const r: Record<string, A> = { ...x }
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        r[k] = Object.prototype.hasOwnProperty.call(x, k) ? S.concat(x[k], y[k]) : y[k]
      }
      return r
    },
    empty
  }
}

/**
 * Lookup the value for a key in a record
 */
export function lookup_<A>(r: ReadonlyRecord<string, A>, k: string): Option<A> {
  return Object.prototype.hasOwnProperty.call(r, k) ? some_1(r[k]) : none
}

export function lookup(k: string): <A>(r: ReadonlyRecord<string, A>) => Option<A> {
  return (r) => (Object.prototype.hasOwnProperty.call(r, k) ? some_1(r[k]) : none)
}

export const empty: ReadonlyRecord<string, never> = {}

/**
 * Map a record passing the keys to the iterating function
 */
export function mapWithIndex<K extends string, A, B>(
  f: (k: K, a: A) => B
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<K, B>
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return (fa) => {
    const out: Record<string, B> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      out[key] = f(key, fa[key])
    }
    return out
  }
}

export function mapWithIndex_<K extends string, A, B>(
  fa: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => B
): ReadonlyRecord<K, B>
export function mapWithIndex_<A, B>(
  fa: ReadonlyRecord<string, A>,
  f: (k: string, a: A) => B
): ReadonlyRecord<string, B> {
  const out: Record<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    out[key] = f(key, fa[key])
  }
  return out
}

/**
 * Map a record passing the values to the iterating function
 */
export function map<A, B>(
  f: (a: A) => B
): <K extends string>(fa: ReadonlyRecord<K, A>) => ReadonlyRecord<K, B>
export function map<A, B>(
  f: (a: A) => B
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return mapWithIndex((_, a) => f(a))
}

export function map_<K extends string, A, B>(
  fa: ReadonlyRecord<K, A>,
  f: (a: A) => B
): ReadonlyRecord<K, B>
export function map_<A, B>(
  fa: ReadonlyRecord<string, A>,
  f: (a: A) => B
): ReadonlyRecord<string, B> {
  return mapWithIndex_(fa, (_, a) => f(a))
}

export function reduceWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, b: B, a: A) => B
): (fa: ReadonlyRecord<K, A>) => B
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: ReadonlyRecord<string, A>) => B {
  return (fa) => {
    let out = b
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      out = f(k, out, fa[k])
    }
    return out
  }
}

export function reduceWithIndex_<K extends string, A, B>(
  fa: ReadonlyRecord<K, A>,
  b: B,
  f: (k: K, b: B, a: A) => B
): B
export function reduceWithIndex_<A, B>(
  fa: ReadonlyRecord<string, A>,
  b: B,
  f: (k: string, b: B, a: A) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = 0; i < len; i++) {
    const k = keys[i]
    out = f(k, out, fa[k])
  }
  return out
}

export function foldMapWithIndex<M>(
  M: Monoid<M>
): <K extends string, A>(f: (k: K, a: A) => M) => (fa: ReadonlyRecord<K, A>) => M
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (k: string, a: A) => M) => (fa: ReadonlyRecord<string, A>) => M {
  return (f) => (fa) => {
    let out = M.empty
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      out = M.concat(out, f(k, fa[k]))
    }
    return out
  }
}

export function foldMapWithIndex_<M>(
  M: Monoid<M>
): <K extends string, A>(fa: ReadonlyRecord<K, A>, f: (k: K, a: A) => M) => M
export function foldMapWithIndex_<M>(
  M: Monoid<M>
): <A>(fa: ReadonlyRecord<string, A>, f: (k: string, a: A) => M) => M {
  return (fa, f) => {
    let out = M.empty
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      out = M.concat(out, f(k, fa[k]))
    }
    return out
  }
}

export function reduceRightWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, a: A, b: B) => B
): (fa: ReadonlyRecord<K, A>) => B
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: ReadonlyRecord<string, A>) => B {
  return (fa) => {
    let out = b
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = len - 1; i >= 0; i--) {
      const k = keys[i]
      out = f(k, fa[k], out)
    }
    return out
  }
}

export function reduceRightWithIndex_<K extends string, A, B>(
  fa: ReadonlyRecord<K, A>,
  b: B,
  f: (k: K, a: A, b: B) => B
): B
export function reduceRightWithIndex_<A, B>(
  fa: ReadonlyRecord<string, A>,
  b: B,
  f: (k: string, a: A, b: B) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = len - 1; i >= 0; i--) {
    const k = keys[i]
    out = f(k, fa[k], out)
  }
  return out
}

/**
 * Create a record with one key/value pair
 */
export function singleton<K extends string, A>(k: K, a: A): ReadonlyRecord<K, A> {
  return { [k]: a } as any
}

export function traverseWithIndex<F extends URIS4>(
  F: CApplicative4MAP<F>
): <K extends string, S, R, E, A, B>(
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS4, E>(
  F: CApplicative4MAPC<F, E>
): <K extends string, S, R, A, B>(
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS4>(
  F: CApplicative4MA<F>
): <K extends string, S, R, E, A, B>(
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS4, E>(
  F: CApplicative4MAC<F, E>
): <K extends string, S, R, A, B>(
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS4>(
  F: CApplicative4<F>
): <K extends string, S, R, E, A, B>(
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS3>(
  F: CApplicative3<F>
): <K extends string, R, E, A, B>(
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS3, E>(
  F: CApplicative3C<F, E>
): <K extends string, R, A, B>(
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS2>(
  F: CApplicative2<F>
): <K extends string, E, A, B>(
  f: (k: K, a: A) => Kind2<F, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS2, E>(
  F: CApplicative2C<F, E>
): <K extends string, A, B>(
  f: (k: K, a: A) => Kind2<F, E, B>
) => (ta: ReadonlyRecord<K, A>) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex<F extends URIS>(
  F: CApplicative1<F>
): <K extends string, A, B>(
  f: (k: K, a: A) => Kind<F, B>
) => (ta: ReadonlyRecord<K, A>) => Kind<F, ReadonlyRecord<K, B>>
export function traverseWithIndex<F>(
  F: CApplicative<F>
): <K extends string, A, B>(
  f: (k: K, a: A) => HKT<F, B>
) => (ta: ReadonlyRecord<K, A>) => HKT<F, ReadonlyRecord<K, B>>
export function traverseWithIndex<F>(
  F: CApplicative<F>
): <A, B>(
  f: (k: string, a: A) => HKT<F, B>
) => (ta: ReadonlyRecord<string, A>) => HKT<F, ReadonlyRecord<string, B>> {
  return <A, B>(f: (k: string, a: A) => HKT<F, B>) => (
    ta: ReadonlyRecord<string, A>
  ): HKT<F, ReadonlyRecord<string, B>> => {
    const keys = Object.keys(ta)
    if (keys.length === 0) {
      return F.of(empty)
    }
    let fr: HKT<F, Record<string, B>> = F.of({})
    for (const key of keys) {
      fr = pipe(
        fr,
        F.map((r) => (b: B) => {
          r[key] = b
          return r
        }),
        F.ap(f(key, ta[key]))
      )
    }
    return fr
  }
}

export function traverseWithIndex_<F extends URIS4>(
  F: CApplicative4MAP<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS4, E>(
  F: CApplicative4MAPC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS4>(
  F: CApplicative4MA<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS4, E>(
  F: CApplicative4MAC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS4>(
  F: CApplicative4<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS3>(
  F: CApplicative3<F>
): <K extends string, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS3, E>(
  F: CApplicative3C<F, E>
): <K extends string, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS2>(
  F: CApplicative2<F>
): <K extends string, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS2, E>(
  F: CApplicative2C<F, E>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F extends URIS>(
  F: CApplicative1<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind<F, B>
) => Kind<F, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F>(
  F: CApplicative<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<K, B>>
export function traverseWithIndex_<F>(
  F: CApplicative<F>
): <A, B>(
  ta: ReadonlyRecord<string, A>,
  f: (k: string, a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<string, B>> {
  return <A, B>(
    ta: ReadonlyRecord<string, A>,
    f: (k: string, a: A) => HKT<F, B>
  ): HKT<F, ReadonlyRecord<string, B>> => {
    const keys = Object.keys(ta)
    if (keys.length === 0) {
      return F.of(empty)
    }
    let fr: HKT<F, Record<string, B>> = F.of({})
    for (const key of keys) {
      fr = pipe(
        fr,
        F.map((r) => (b: B) => {
          r[key] = b
          return r
        }),
        F.ap(f(key, ta[key]))
      )
    }
    return fr
  }
}

export function traverse<F extends MaURIS, E>(
  F: CApplicative4MAC<F, E>
): <S, R, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends MaURIS, E>(
  F: CApplicative4MAPC<F, E>
): <S, R, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends MaURIS>(
  F: CApplicative4MAP<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends MaURIS>(
  F: CApplicative4MA<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS4>(
  F: CApplicative4<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS3>(
  F: CApplicative3<F>
): <R, E, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS3, E>(
  F: CApplicative3C<F, E>
): <R, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(
  ta: ReadonlyRecord<K, A>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS2>(
  F: CApplicative2<F>
): <E, A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: ReadonlyRecord<K, A>) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS2, E>(
  F: CApplicative2C<F, E>
): <A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: ReadonlyRecord<K, A>) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse<F extends URIS>(
  F: CApplicative1<F>
): <A, B>(
  f: (a: A) => Kind<F, B>
) => <K extends string>(ta: ReadonlyRecord<K, A>) => Kind<F, ReadonlyRecord<K, B>>
export function traverse<F>(
  F: CApplicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => <K extends string>(ta: ReadonlyRecord<K, A>) => HKT<F, ReadonlyRecord<K, B>>
export function traverse<F>(
  F: CApplicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => (ta: ReadonlyRecord<string, A>) => HKT<F, ReadonlyRecord<string, B>> {
  const traverseWithIndexF = traverseWithIndex(F)
  return (f) => traverseWithIndexF((_, a) => f(a))
}

export function traverse_<F extends MaURIS, E>(
  F: CApplicative4MAC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends MaURIS, E>(
  F: CApplicative4MAPC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends MaURIS>(
  F: CApplicative4MAP<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends MaURIS>(
  F: CApplicative4MA<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS4>(
  F: CApplicative4<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS3>(
  F: CApplicative3<F>
): <K extends string, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS3, E>(
  F: CApplicative3C<F, E>
): <K extends string, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS2>(
  F: CApplicative2<F>
): <K extends string, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS2, E>(
  F: CApplicative2C<F, E>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse_<F extends URIS>(
  F: CApplicative1<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind<F, B>
) => Kind<F, ReadonlyRecord<K, B>>
export function traverse_<F>(
  F: CApplicative<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<K, B>>
export function traverse_<F>(
  F: CApplicative<F>
): <A, B>(
  ta: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<string, B>> {
  const traverseWithIndexF = traverseWithIndex_(F)
  return (fa, f) => traverseWithIndexF(fa, (_, a) => f(a))
}

export function sequence<F extends URIS4, E>(
  F: CApplicative4MAC<F, E>
): <K extends string, S, R, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS4, E>(
  F: CApplicative4MAPC<F, E>
): <K extends string, S, R, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS4>(
  F: CApplicative4MA<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS4>(
  F: CApplicative4MAP<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS4>(
  F: CApplicative4<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS3>(
  F: CApplicative3<F>
): <K extends string, R, E, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS3, E>(
  F: CApplicative3C<F, E>
): <K extends string, R, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS2>(
  F: CApplicative2<F>
): <K extends string, E, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS2, E>(
  F: CApplicative2C<F, E>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence<F extends URIS>(
  F: CApplicative1<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind<F, A>>
) => Kind<F, ReadonlyRecord<K, A>>
export function sequence<F>(
  F: CApplicative<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, HKT<F, A>>
) => HKT<F, ReadonlyRecord<K, A>>
export function sequence<F>(
  F: CApplicative<F>
): <A>(ta: ReadonlyRecord<string, HKT<F, A>>) => HKT<F, ReadonlyRecord<string, A>> {
  return traverseWithIndex(F)((_, a) => a)
}

export function partitionMapWithIndex<K extends string, A, B, C>(
  f: (key: K, a: A) => Either<B, C>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> {
  return (fa) => {
    const left: Record<string, B> = {}
    const right: Record<string, C> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const e = f(key, fa[key])
      switch (e._tag) {
        case "Left":
          left[key] = e.left
          break
        case "Right":
          right[key] = e.right
          break
      }
    }
    return {
      left,
      right
    }
  }
}

export function partitionMapWithIndex_<K extends string, A, B, C>(
  fa: ReadonlyRecord<K, A>,
  f: (key: K, a: A) => Either<B, C>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>
export function partitionMapWithIndex_<A, B, C>(
  fa: ReadonlyRecord<string, A>,
  f: (key: string, a: A) => Either<B, C>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> {
  const left: Record<string, B> = {}
  const right: Record<string, C> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = f(key, fa[key])
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return {
    left,
    right
  }
}

export function partitionWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>
export function partitionWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> {
  return (fa) => {
    const left: Record<string, A> = {}
    const right: Record<string, A> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const a = fa[key]
      if (predicateWithIndex(key, a)) {
        right[key] = a
      } else {
        left[key] = a
      }
    }
    return {
      left,
      right
    }
  }
}

export function partitionWithIndex_<K extends string, A, B extends A>(
  fa: ReadonlyRecord<K, A>,
  refinementWithIndex: RefinementWithIndex<K, A, B>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>
export function partitionWithIndex_<K extends string, A>(
  fa: ReadonlyRecord<K, A>,
  predicateWithIndex: PredicateWithIndex<K, A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>
export function partitionWithIndex_<A>(
  fa: ReadonlyRecord<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> {
  const left: Record<string, A> = {}
  const right: Record<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const a = fa[key]
    if (predicateWithIndex(key, a)) {
      right[key] = a
    } else {
      left[key] = a
    }
  }
  return {
    left,
    right
  }
}

export function filterMapWithIndex<K extends string, A, B>(
  f: (key: K, a: A) => Option<B>
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<string, B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => Option<B>
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return (fa) => {
    const r: Record<string, B> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const optionB = f(key, fa[key])
      if (isSome(optionB)) {
        r[key] = optionB.value
      }
    }
    return r
  }
}

export function filterMapWithIndex_<K extends string, A, B>(
  fa: ReadonlyRecord<K, A>,
  f: (key: K, a: A) => Option<B>
): ReadonlyRecord<string, B>
export function filterMapWithIndex_<A, B>(
  fa: ReadonlyRecord<string, A>,
  f: (key: string, a: A) => Option<B>
): ReadonlyRecord<string, B> {
  const r: Record<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionB = f(key, fa[key])
    if (isSome(optionB)) {
      r[key] = optionB.value
    }
  }
  return r
}

export function filterWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<string, B>
export function filterWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<string, A>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (fa) => {
    const out: Record<string, A> = {}
    let changed = false
    for (const key in fa) {
      if (Object.prototype.hasOwnProperty.call(fa, key)) {
        const a = fa[key]
        if (predicateWithIndex(key, a)) {
          out[key] = a
        } else {
          changed = true
        }
      }
    }
    return changed ? out : fa
  }
}

export function filterWithIndex_<K extends string, A, B extends A>(
  fa: ReadonlyRecord<K, A>,
  refinementWithIndex: RefinementWithIndex<K, A, B>
): ReadonlyRecord<string, B>
export function filterWithIndex_<K extends string, A>(
  fa: ReadonlyRecord<K, A>,
  predicateWithIndex: PredicateWithIndex<K, A>
): ReadonlyRecord<string, A>
export function filterWithIndex_<A>(
  fa: ReadonlyRecord<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): ReadonlyRecord<string, A> {
  const out: Record<string, A> = {}
  let changed = false
  for (const key in fa) {
    if (Object.prototype.hasOwnProperty.call(fa, key)) {
      const a = fa[key]
      if (predicateWithIndex(key, a)) {
        out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? out : fa
}

/**
 * Create a record from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export function fromFoldable<F extends URIS3, A>(
  M: Magma<A>,
  F: CFoldable3<F>
): <K extends string, R, E>(
  fka: Kind3<F, R, E, readonly [K, A]>
) => ReadonlyRecord<K, A>
export function fromFoldable<F extends URIS2, A>(
  M: Magma<A>,
  F: CFoldable2<F>
): <K extends string, E>(fka: Kind2<F, E, readonly [K, A]>) => ReadonlyRecord<K, A>
export function fromFoldable<F extends URIS, A>(
  M: Magma<A>,
  F: CFoldable1<F>
): <K extends string>(fka: Kind<F, readonly [K, A]>) => ReadonlyRecord<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: CFoldable<F>
): <K extends string>(fka: HKT<F, readonly [K, A]>) => ReadonlyRecord<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: CFoldable<F>
): (fka: HKT<F, readonly [string, A]>) => ReadonlyRecord<string, A> {
  const fromFoldableMapM = fromFoldableMap(M, F)
  return fromFoldableMapM(identity)
}

/**
 * Create a record from a foldable collection using the specified functions to
 *
 * - map to key/value pairs
 * - combine values for duplicate keys.
 *
 * @example
 * import { getLastSemigroup } from '@matechs/core/Semigroup'
 * import { array, zip } from '@matechs/core/Array'
 * import { identity } from '@matechs/core/Function'
 * import { ReadonlyRecord, fromFoldableMap } from '@matechs/core/Record'
 *
 * // like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: ReadonlyArray<K>, values: ReadonlyArray<A>): ReadonlyRecord<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), array)(identity)(zip(keys, values))
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
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), array)(user => [user.id, user])(users), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 */
export function fromFoldableMap<F extends URIS3, B>(
  M: Magma<B>,
  F: CFoldable3<F>
): <A, K extends string>(
  f: (a: A) => readonly [K, B]
) => <R, E>(fa: Kind3<F, R, E, A>) => ReadonlyRecord<K, B>
export function fromFoldableMap<F extends URIS2, B>(
  M: Magma<B>,
  F: CFoldable2<F>
): <A, K extends string>(
  f: (a: A) => readonly [K, B]
) => <E>(fa: Kind2<F, E, A>) => ReadonlyRecord<K, B>
export function fromFoldableMap<F extends URIS, B>(
  M: Magma<B>,
  F: CFoldable1<F>
): <A, K extends string>(
  f: (a: A) => readonly [K, B]
) => (fa: Kind<F, A>) => ReadonlyRecord<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: CFoldable<F>
): <A, K extends string>(
  f: (a: A) => readonly [K, B]
) => (fa: HKT<F, A>) => ReadonlyRecord<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: CFoldable<F>
): <A>(
  f: (a: A) => readonly [string, B]
) => (fa: HKT<F, A>) => ReadonlyRecord<string, B> {
  return <A>(f: (a: A) => readonly [string, B]) => {
    return F.reduce<A, Record<string, B>>({}, (r, a) => {
      const [k, b] = f(a)
      r[k] = Object.prototype.hasOwnProperty.call(r, k) ? M.concat(r[k], b) : b
      return r
    })
  }
}

export function fromFoldableMap_<F extends URIS3, B>(
  M: Magma<B>,
  F: CFoldable3<F>
): <R, E, A, K extends string>(
  fa: Kind3<F, R, E, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap_<F extends URIS2, B>(
  M: Magma<B>,
  F: CFoldable2<F>
): <E, A, K extends string>(
  fa: Kind2<F, E, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap_<F extends URIS, B>(
  M: Magma<B>,
  F: CFoldable1<F>
): <A, K extends string>(
  fa: Kind<F, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap_<F, B>(
  M: Magma<B>,
  F: CFoldable<F>
): <A, K extends string>(
  fa: HKT<F, A>,
  f: (a: A) => readonly [K, B]
) => ReadonlyRecord<K, B>
export function fromFoldableMap_<F, B>(
  M: Magma<B>,
  F: CFoldable<F>
): <A>(fa: HKT<F, A>, f: (a: A) => readonly [string, B]) => ReadonlyRecord<string, B> {
  return <A>(fa: HKT<F, A>, f: (a: A) => readonly [string, B]) => {
    return F.reduce<A, Record<string, B>>({}, (r, a) => {
      const [k, b] = f(a)
      r[k] = Object.prototype.hasOwnProperty.call(r, k) ? M.concat(r[k], b) : b
      return r
    })(fa)
  }
}

export function every<A>(
  predicate: Predicate<A>
): (r: ReadonlyRecord<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (!predicate(r[k])) {
        return false
      }
    }
    return true
  }
}

export function every_<A>(
  r: ReadonlyRecord<string, A>,
  predicate: Predicate<A>
): boolean {
  for (const k in r) {
    if (!predicate(r[k])) {
      return false
    }
  }
  return true
}

export function some<A>(
  predicate: (a: A) => boolean
): (r: ReadonlyRecord<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (predicate(r[k])) {
        return true
      }
    }
    return false
  }
}

export function some_<A>(
  r: ReadonlyRecord<string, A>,
  predicate: (a: A) => boolean
): boolean {
  for (const k in r) {
    if (predicate(r[k])) {
      return true
    }
  }
  return false
}

export function elem<A>(
  E: Eq<A>
): (a: A) => (fa: ReadonlyRecord<string, A>) => boolean {
  return (a) => (fa) => {
    for (const k in fa) {
      if (E.equals(fa[k], a)) {
        return true
      }
    }
    return false
  }
}

export function elem_<A>(E: Eq<A>): (fa: ReadonlyRecord<string, A>, a: A) => boolean {
  return (fa, a) => {
    for (const k in fa) {
      if (E.equals(fa[k], a)) {
        return true
      }
    }
    return false
  }
}

export const compact = <A>(
  fa: ReadonlyRecord<string, Option<A>>
): ReadonlyRecord<string, A> => {
  const r: Record<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionA = fa[key]
    if (isSome(optionA)) {
      r[key] = optionA.value
    }
  }
  return r
}

export const separate = <A, B>(
  fa: ReadonlyRecord<string, Either<A, B>>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>> => {
  const left: Record<string, A> = {}
  const right: Record<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = fa[key]
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return {
    left,
    right
  }
}

export function wither<F extends URIS4>(
  F: CApplicative4MAP<F>
): <A, S, R, E, B>(
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS4, E>(
  F: CApplicative4MAPC<F, E>
): <A, S, R, B>(
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS4, E>(
  F: CApplicative4MAC<F, E>
): <A, S, R, B>(
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS4>(
  F: CApplicative4MA<F>
): <A, S, R, E, B>(
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS4>(
  F: CApplicative4<F>
): <A, S, R, E, B>(
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS3>(
  F: CApplicative3<F>
): <A, R, E, B>(
  f: (a: A) => Kind3<F, R, E, Option<B>>
) => <K extends string>(
  wa: ReadonlyRecord<K, A>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS2>(
  F: CApplicative2<F>
): <A, E, B>(
  f: (a: A) => Kind2<F, E, Option<B>>
) => <K extends string>(wa: ReadonlyRecord<K, A>) => Kind2<F, E, ReadonlyRecord<K, B>>
export function wither<F extends URIS>(
  F: CApplicative1<F>
): <A, B>(
  f: (a: A) => Kind<F, Option<B>>
) => <K extends string>(wa: ReadonlyRecord<K, A>) => Kind<F, ReadonlyRecord<K, B>>
export function wither<F>(
  F: CApplicative<F>
): <A, B>(
  f: (a: A) => HKT<F, Option<B>>
) => <K extends string>(wa: ReadonlyRecord<K, A>) => HKT<F, ReadonlyRecord<K, B>> {
  const traverseF = traverse(F)
  return (f) => flow(traverseF(f), F.map(compact))
}

export function wither_<F extends URIS4>(
  F: CApplicative4MAP<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS4, E>(
  F: CApplicative4MAPC<F, E>
): <K extends string, A, S, R, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS4, E>(
  F: CApplicative4MAC<F, E>
): <K extends string, A, S, R, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS4>(
  F: CApplicative4MA<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS4>(
  F: CApplicative4<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS3>(
  F: CApplicative3<F>
): <K extends string, A, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, Option<B>>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS2>(
  F: CApplicative2<F>
): <K extends string, A, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, Option<B>>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function wither_<F extends URIS>(
  F: CApplicative1<F>
): <K extends string, A, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind<F, Option<B>>
) => Kind<F, ReadonlyRecord<K, B>>
export function wither_<F>(
  F: CApplicative<F>
): <K extends string, A, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyRecord<K, B>> {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(compact)(traverseF(wa, f))
}

export const wilt: {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => Kind<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => <K extends string>(
    wa: ReadonlyRecord<K, A>
  ) => HKT<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
} = <F>(
  F: CApplicative<F>
): (<A, B, C>(
  f: (a: A) => HKT<F, Either<B, C>>
) => (
  wa: ReadonlyRecord<string, A>
) => HKT<F, Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>>) => {
  const traverseF = traverse(F)
  return (f) => flow(traverseF(f), F.map(separate))
}

export const wilt_: {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <K extends string, A, S, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <K extends string, A, S, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, A, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, A, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, A, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, Either<B, C>>
  ) => Kind<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F>(F: CApplicative<F>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
} = <F>(
  F: CApplicative<F>
): (<A, B, C>(
  wa: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, Either<B, C>>
) => HKT<F, Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>>) => {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(separate)(traverseF(wa, f))
}

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => ReadonlyRecord<K, B>
  <A>(predicate: Predicate<A>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => ReadonlyRecord<K, A>
} = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): ReadonlyRecord<string, A> => filterWithIndex_(fa, (_, a) => predicate(a))

export const filter_: {
  <K extends string, A, B extends A>(
    fa: ReadonlyRecord<K, A>,
    refinement: Refinement<A, B>
  ): ReadonlyRecord<K, B>
  <K extends string, A>(
    fa: ReadonlyRecord<K, A>,
    predicate: Predicate<A>
  ): ReadonlyRecord<K, A>
} = <A>(
  fa: ReadonlyRecord<string, A>,
  predicate: Predicate<A>
): ReadonlyRecord<string, A> => filterWithIndex_(fa, (_, a) => predicate(a))

export const filterMap: {
  <A, B>(f: (a: A) => Option<B>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => ReadonlyRecord<K, B>
  <A, B>(f: (a: A) => Option<B>): (
    fa: ReadonlyRecord<string, A>
  ) => ReadonlyRecord<string, B>
} = <A, B>(f: (a: A) => Option<B>) => filterMapWithIndex((_, a: A) => f(a))

export const filterMap_: {
  <K extends string, A, B>(
    fa: ReadonlyRecord<K, A>,
    f: (a: A) => Option<B>
  ): ReadonlyRecord<K, B>
  <A, B>(fa: ReadonlyRecord<string, A>, f: (a: A) => Option<B>): ReadonlyRecord<
    string,
    B
  >
} = <A, B>(fa: ReadonlyRecord<string, A>, f: (a: A) => Option<B>) =>
  filterMapWithIndex_(fa, (_, a: A) => f(a))

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Readonly<Record<string, A>>) => M = (M) => {
  const foldMapWithIndexM = foldMapWithIndex(M)
  return (f) => foldMapWithIndexM((_, a) => f(a))
}

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: Readonly<Record<string, A>>, f: (a: A) => M) => M = (M) => {
  const foldMapWithIndexM = foldMapWithIndex_(M)
  return (fa, f) => foldMapWithIndexM(fa, (_, a) => f(a))
}

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => Separated<ReadonlyRecord<K, A>, ReadonlyRecord<K, B>>
  <A>(predicate: Predicate<A>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => Separated<ReadonlyRecord<K, A>, ReadonlyRecord<K, A>>
} = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

export const partition_: {
  <K extends string, A, B extends A>(
    fa: ReadonlyRecord<K, A>,
    refinement: Refinement<A, B>
  ): Separated<ReadonlyRecord<K, A>, ReadonlyRecord<K, B>>
  <K extends string, A>(fa: ReadonlyRecord<K, A>, predicate: Predicate<A>): Separated<
    ReadonlyRecord<K, A>,
    ReadonlyRecord<K, A>
  >
} = <A>(
  fa: ReadonlyRecord<string, A>,
  predicate: Predicate<A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): <K extends string>(
    fa: ReadonlyRecord<K, A>
  ) => Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>
  <A, B, C>(f: (a: A) => Either<B, C>): (
    fa: ReadonlyRecord<string, A>
  ) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>
} = <A, B, C>(f: (a: A) => Either<B, C>) => partitionMapWithIndex((_, a: A) => f(a))

export const partitionMap_: {
  <K extends string, A, B, C>(
    fa: ReadonlyRecord<K, A>,
    f: (a: A) => Either<B, C>
  ): Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>
  <A, B, C>(fa: ReadonlyRecord<string, A>, f: (a: A) => Either<B, C>): Separated<
    ReadonlyRecord<string, B>,
    ReadonlyRecord<string, C>
  >
} = <A, B, C>(fa: ReadonlyRecord<string, A>, f: (a: A) => Either<B, C>) =>
  partitionMapWithIndex_(fa, (_, a: A) => f(a))

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Readonly<Record<string, A>>) => B = (b, f) =>
  reduceWithIndex(b, (_, b, a) => f(b, a))

export const reduce_: <A, B>(
  fa: Readonly<Record<string, A>>,
  b: B,
  f: (b: B, a: A) => B
) => B = (fa, b, f) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Readonly<Record<string, A>>) => B = (b, f) =>
  reduceRightWithIndex(b, (_, a, b) => f(a, b))

export const reduceRight_: <A, B>(
  fa: Readonly<Record<string, A>>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))

export const toReadonlyArray: <K extends string, A>(
  r: ReadonlyRecord<K, A>
) => ReadonlyArray<readonly [K, A]> =
  /*#__PURE__*/
  (() => collect((k, a) => [k, a]))() as any

/**
 * Unfolds a record into a list of key/value pairs
 */
export function toUnfoldable<F extends URIS>(
  U: CUnfoldable1<F>
): <K extends string, A>(r: ReadonlyRecord<K, A>) => Kind<F, readonly [K, A]>
export function toUnfoldable<F>(
  U: CUnfoldable<F>
): <K extends string, A>(r: ReadonlyRecord<K, A>) => HKT<F, readonly [K, A]>
export function toUnfoldable<F>(
  U: CUnfoldable<F>
): <A>(r: ReadonlyRecord<string, A>) => HKT<F, readonly [string, A]> {
  return (r) => {
    const arr = toReadonlyArray(r)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? some_1([arr[b], b + 1]) : none))
  }
}

export const foldableRecord: CFoldable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight
}

export const compactableRecord: CCompactable1<URI> = {
  URI,
  compact,
  separate
}

export const traversableRecord: CTraversable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight,
  map,
  sequence,
  traverse
}

export const witherableRecord: CWitherable1<URI> = {
  URI,
  separate,
  compact,
  traverse,
  sequence,
  map,
  filter,
  filterMap,
  foldMap,
  partition,
  partitionMap,
  reduce,
  reduceRight,
  wilt,
  wither
}

export const traversableWithIndexRecord: CTraversableWithIndex1<URI, string> = {
  URI,
  foldMap,
  reduce,
  reduceRight,
  map,
  sequence,
  traverse,
  foldMapWithIndex,
  mapWithIndex,
  reduceRightWithIndex,
  reduceWithIndex,
  traverseWithIndex
}

export const record: CFunctorWithIndex1<URI, string> &
  CFoldable1<URI> &
  CTraversableWithIndex1<URI, string> &
  CCompactable1<URI> &
  CFilterableWithIndex1<URI, string> &
  CWitherable1<URI> &
  CFoldableWithIndex1<URI, string> = {
  URI,
  map,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap,
  wither,
  wilt,
  mapWithIndex,
  reduceWithIndex,
  foldMapWithIndex,
  reduceRightWithIndex,
  traverseWithIndex,
  partitionMapWithIndex,
  partitionWithIndex,
  filterMapWithIndex,
  filterWithIndex
}

//
// Compatibility with fp-ts ecosystem
//

export function traverseWithIndex__<F extends URIS4>(
  F: Applicative4EP<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS4, E>(
  F: Applicative4ECP<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS4>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS4, E>(
  F: Applicative4EC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS4>(
  F: Applicative4<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => Kind<F, B>
) => Kind<F, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F>(
  F: Applicative<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (k: K, a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<K, B>>
export function traverseWithIndex__<F>(
  F: Applicative<F>
): <A, B>(
  ta: ReadonlyRecord<string, A>,
  f: (k: string, a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<string, B>> {
  return <A, B>(
    ta: ReadonlyRecord<string, A>,
    f: (k: string, a: A) => HKT<F, B>
  ): HKT<F, ReadonlyRecord<string, B>> => {
    const keys = Object.keys(ta)
    if (keys.length === 0) {
      return F.of(empty)
    }
    let fr: HKT<F, Record<string, B>> = F.of({})
    for (const key of keys) {
      fr = F.ap(
        F.map(fr, (r) => (b: B) => {
          r[key] = b
          return r
        }),
        f(key, ta[key])
      )
    }
    return fr
  }
}

export function traverse__<F extends MaURIS, E>(
  F: Applicative4EC<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends MaURIS, E>(
  F: Applicative4ECP<F, E>
): <K extends string, S, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends MaURIS>(
  F: Applicative4EP<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends MaURIS>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS4>(
  F: Applicative4<F>
): <K extends string, S, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, B>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, B>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, B>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function traverse__<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => Kind<F, B>
) => Kind<F, ReadonlyRecord<K, B>>
export function traverse__<F>(
  F: Applicative<F>
): <K extends string, A, B>(
  ta: ReadonlyRecord<K, A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<K, B>>
export function traverse__<F>(
  F: Applicative<F>
): <A, B>(
  ta: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<string, B>> {
  const traverseWithIndexF = traverseWithIndex__(F)
  return (fa, f) => traverseWithIndexF(fa, (_, a) => f(a))
}

export const wilt__: {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <K extends string, A, S, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: Applicative4EP<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <K extends string, A, S, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends MaURIS>(F: Applicative4E<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS4>(F: Applicative4<F>): <K extends string, A, S, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3>(F: Applicative3<F>): <K extends string, A, R, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <K extends string, A, R, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2>(F: Applicative2<F>): <K extends string, A, E, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F extends URIS>(F: Applicative1<F>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, Either<B, C>>
  ) => Kind<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
  <F>(F: Applicative<F>): <K extends string, A, B, C>(
    wa: ReadonlyRecord<K, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<ReadonlyRecord<K, B>, ReadonlyRecord<K, C>>>
} = <F>(
  F: Applicative<F>
): (<A, B, C>(
  wa: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, Either<B, C>>
) => HKT<F, Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>>) => {
  const traverseF = traverse__(F)
  return (wa, f) => F.map(traverseF(wa, f), separate)
}

export function sequence_<F extends URIS4, E>(
  F: Applicative4EC<F, E>
): <K extends string, S, R, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS4, E>(
  F: Applicative4ECP<F, E>
): <K extends string, S, R, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS4>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS4>(
  F: Applicative4EP<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS4>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A>(
  ta: ReadonlyRecord<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A>(
  ta: ReadonlyRecord<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind2<F, E, A>>
) => Kind2<F, E, ReadonlyRecord<K, A>>
export function sequence_<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, Kind<F, A>>
) => Kind<F, ReadonlyRecord<K, A>>
export function sequence_<F>(
  F: Applicative<F>
): <K extends string, A>(
  ta: ReadonlyRecord<K, HKT<F, A>>
) => HKT<F, ReadonlyRecord<K, A>>
export function sequence_<F>(
  F: Applicative<F>
): <A>(ta: ReadonlyRecord<string, HKT<F, A>>) => HKT<F, ReadonlyRecord<string, A>> {
  return (ta) => traverseWithIndex__(F)(ta, (_, a) => a)
}

export function wither__<F extends URIS4>(
  F: Applicative4EP<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS4, E>(
  F: Applicative4ECP<F, E>
): <K extends string, A, S, R, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, unknown, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS4, E>(
  F: Applicative4EC<F, E>
): <K extends string, A, S, R, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS4>(
  F: Applicative4E<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS4>(
  F: Applicative4<F>
): <K extends string, A, S, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind4<F, S, R, E, Option<B>>
) => Kind4<F, S, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, A, R, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind3<F, R, E, Option<B>>
) => Kind3<F, R, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, A, E, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind2<F, E, Option<B>>
) => Kind2<F, E, ReadonlyRecord<K, B>>
export function wither__<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => Kind<F, Option<B>>
) => Kind<F, ReadonlyRecord<K, B>>
export function wither__<F>(
  F: Applicative<F>
): <K extends string, A, B>(
  wa: ReadonlyRecord<K, A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyRecord<K, B>> {
  const traverseF = traverse__(F)
  return (wa, f) => F.map(traverseF(wa, f), compact)
}

export const record_: FunctorWithIndex1<URI, string> &
  Foldable1<URI> &
  TraversableWithIndex1<URI, string> &
  Compactable1<URI> &
  FilterableWithIndex1<URI, string> &
  Witherable1<URI> &
  FoldableWithIndex1<URI, string> = {
  URI,
  map: map_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse__,
  sequence: sequence_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  wither: wither__,
  wilt: wilt__,
  mapWithIndex: mapWithIndex_,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex: traverseWithIndex__,
  partitionMapWithIndex: partitionMapWithIndex_,
  partitionWithIndex: partitionWithIndex_,
  filterMapWithIndex: filterMapWithIndex_,
  filterWithIndex: filterWithIndex_
}
