/* adapted from https://github.com/gcanti/fp-ts */

import type {
  MaURIS,
  URIS4,
  CApplicative4MA,
  CApplicative4MAP,
  Kind4,
  CApplicative4MAPC,
  CApplicative4MAC,
  CApplicative4,
  URIS3,
  CApplicative3,
  Kind3,
  CApplicative3C,
  URIS2,
  CApplicative2,
  Kind2,
  CApplicative2C,
  URIS,
  CApplicative1,
  Kind,
  CApplicative,
  HKT,
  Separated,
  RefinementWithIndex,
  PredicateWithIndex,
  CFoldable3,
  CFoldable2,
  CFoldable1,
  CFoldable,
  CWilt1,
  CFunctorWithIndex1,
  CTraversableWithIndex1,
  CCompactable1,
  CFilterableWithIndex1,
  CWitherable1,
  CFoldableWithIndex1,
  CFilter1,
  CPartition1,
  CUnfoldable1,
  CUnfoldable
} from "../../Base"
import type { Either } from "../../Either"
import { Eq, fromEquals } from "../../Eq"
import { identity, Predicate, flow } from "../../Function"
import type { Magma } from "../../Magma"
import type { Monoid } from "../../Monoid"
import { isNone, isSome, none, Option, some as some_1 } from "../../Option"
import { pipe } from "../../Pipe"
import type { Semigroup } from "../../Semigroup"
import type { Show } from "../../Show"

export type ReadonlyRecord<K extends string, T> = Readonly<Record<K, T>>

export const URI = "../../Readonly/Record"

export type URI = typeof URI

declare module "../../Base/HKT" {
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
 * import {collect} from '@matechs/core/Readonly/Record'
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
    const oa = lookup(k, r)
    return isNone(oa) ? none : some_1([oa.value, deleteAtk(r)])
  }
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export function isSubrecord<A>(
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

export function getEq<K extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<K, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> {
  const isSubrecordE = isSubrecord(E)
  return fromEquals((x, y) => isSubrecordE(x, y) && isSubrecordE(y, x))
}

/**
 * Returns a `Semigroup` instance for records given a `Semigroup` instance for their values
 *
 * @example
 * import { semigroupSum } from '@matechs/core/Semigroup'
 * import { getMonoid } from '@matechs/core/Readonly/Record'
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
export function lookup<A>(k: string, r: ReadonlyRecord<string, A>): Option<A> {
  return Object.prototype.hasOwnProperty.call(r, k) ? some_1(r[k]) : none
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
 * import { readonlyArray, zip } from '@matechs/core/Readonly/Array'
 * import { identity } from '@matechs/core/Function'
 * import { ReadonlyRecord, fromFoldableMap } from '@matechs/core/Readonly/Record'
 *
 * // like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: ReadonlyArray<K>, values: ReadonlyArray<A>): ReadonlyRecord<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), readonlyArray)(identity)(zip(keys, values))
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
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), readonlyArray)(user => [user.id, user])(users), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 */
export function fromFoldableMap<F extends URIS3, B>(
  M: Magma<B>,
  F: CFoldable3<F>
): <R, E, A, K extends string>(
  f: (a: A) => readonly [K, B]
) => (fa: Kind3<F, R, E, A>) => ReadonlyRecord<K, B>
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

export function elem<A>(E: Eq<A>): (a: A, fa: ReadonlyRecord<string, A>) => boolean {
  return (a, fa) => {
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

export const wilt: CWilt1<URI> = <F>(
  F: CApplicative<F>
): (<A, B, C>(
  f: (a: A) => HKT<F, Either<B, C>>
) => (
  wa: ReadonlyRecord<string, A>
) => HKT<F, Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>>) => {
  const traverseF = traverse(F)
  return (f) => flow(traverseF(f), F.map(separate))
}

export const filter: CFilter1<URI> = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): ReadonlyRecord<string, A> =>
  pipe(
    fa,
    filterWithIndex((_, a) => predicate(a))
  )

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> = (f) =>
  filterMapWithIndex((_, a) => f(a))

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Readonly<Record<string, A>>) => M = (M) => {
  const foldMapWithIndexM = foldMapWithIndex(M)
  return (f) => foldMapWithIndexM((_, a) => f(a))
}

export const partition: CPartition1<URI> = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> =>
  pipe(
    fa,
    partitionWithIndex((_, a) => predicate(a))
  )

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> = (f) =>
  partitionMapWithIndex((_, a) => f(a))

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Readonly<Record<string, A>>) => B = (b, f) =>
  reduceWithIndex(b, (_, b, a) => f(b, a))

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Readonly<Record<string, A>>) => B = (b, f) =>
  reduceRightWithIndex(b, (_, a, b) => f(a, b))

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

export const readonlyRecord: CFunctorWithIndex1<URI, string> &
  CFoldable1<URI> &
  CTraversableWithIndex1<URI, string> &
  CCompactable1<URI> &
  CFilterableWithIndex1<URI, string> &
  CWitherable1<URI> &
  CFoldableWithIndex1<URI, string> = {
  URI,
  _F: "curried",
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
