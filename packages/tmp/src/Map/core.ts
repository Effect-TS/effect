import type { Either } from "@effect-ts/system/Either/core"
import { isLeft } from "@effect-ts/system/Either/core"
import * as M from "@effect-ts/system/Map/core"
import { Map } from "@effect-ts/system/Map/core"
import type { MutableArray } from "@effect-ts/system/Mutable"
import type { Separated } from "@effect-ts/system/Utils"

import type { Associative } from "../_abstract/Associative"
import * as Eq from "../_abstract/Equal"
import type { Identity } from "../_abstract/Identity"
import { makeIdentity } from "../_abstract/Identity"
import type { Ord } from "../_abstract/Ord"
import * as Ordering from "../_abstract/Ordering"
import type { Show } from "../_abstract/Show"
import { makeShow } from "../_abstract/Show"
import type { Predicate, Refinement } from "../Function"
import { pipe, tuple, tupled } from "../Function"
import * as O from "../Option"

/**
 * Lookup key `K` returning `Option[(K, A)]` using strict equality of keys
 */
export function lookupWithKey_<K, A>(m: Map<K, A>, k: K): O.Option<readonly [K, A]> {
  return pipe(
    O.fromNullable(m.get(k)),
    O.map((a) => tuple(k, a))
  )
}

/**
 * Lookup key `K` returning `Option[(K, A)]` using strict equality of keys
 */
export function lookupWithKey<K>(k: K) {
  return <A>(m: Map<K, A>) => lookupWithKey_(m, k)
}

/**
 * Lookup key `K` returning `Option[(K, A)]` using `Equal[K]`
 */
export function getLookupWithKey_<K>(
  E: Eq.Equal<K>
): <A>(m: Map<K, A>, k: K) => O.Option<readonly [K, A]> {
  return <A>(m: Map<K, A>, k: K) => {
    const entries = m.entries()
    let e: M.Next<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals(k)(ka)) {
        return O.some([ka, a])
      }
    }
    return O.none
  }
}

/**
 * Lookup key `K` returning `Option[(K, A)]` using `Equal[K]`
 */
export function getLookupWithKey<K>(E: Eq.Equal<K>) {
  const ge = getLookupWithKey_(E)
  return (k: K) => <A>(m: Map<K, A>) => ge(m, k)
}

/**
 * Insert element `(K, A)` using `Equal[A]`
 */
export function getInsertAt_<K>(
  E: Eq.Equal<K>
): <A>(m: Map<K, A>, k: K, a: A) => Map<K, A> {
  const lookupWithKeyE = getLookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE(m, k)
    if (O.isNone(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}

/**
 * Insert element `(K, A)` using `Equal[A]`
 */
export function getInsertAt<K>(
  E: Eq.Equal<K>
): <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A> {
  const gia = getInsertAt_(E)
  return (k, a) => (m) => gia(m, k, a)
}

/**
 * Insert element `(K, A)` using strict equality
 */
export function insertAt<K, A>(k: K, a: A): (m: Map<K, A>) => Map<K, A> {
  return (m) => {
    const found = lookupWithKey_(m, k)
    if (O.isNone(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}

/**
 * Get the map keys ordered using `O: Ord[K]`
 */
export function getKeys<K>(O: Ord<K>): <A>(m: Map<K, A>) => Array<K> {
  return (m) => Array.from(m.keys()).sort((l, r) => Ordering.toNumber(O.compare(r)(l)))
}

/**
 * Get the map keys ordered by insertion time
 */
export function keys<K, A>(m: Map<K, A>): Array<K> {
  return Array.from(m.keys())
}

/**
 * Collect using `f : (K, A) => B` ordered by `Ord[K]`
 */
export function getCollect_<K>(
  O: Ord<K>
): <A, B>(m: Map<K, A>, f: (k: K, a: A) => B) => Array<B> {
  const keysO = getKeys(O)
  return <A, B>(m: Map<K, A>, f: (k: K, a: A) => B): Array<B> => {
    const out: MutableArray<B> = []
    const ks = keysO(m)
    for (const key of ks) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out.push(f(key, m.get(key)!))
    }
    return out
  }
}

/**
 * Collect using `f : (K, A) => B` ordered by `Ord[K]`
 */
export function getCollect<K>(O: Ord<K>) {
  const gc = getCollect_(O)
  return <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>) => gc(m, f)
}

/**
 * Collect using `f : (K, A) => B` ordered by insertion order
 */
export function collect_<K, A, B>(m: Map<K, A>, f: (k: K, a: A) => B): Array<B> {
  return Array.from(m).map(tupled(f))
}

/**
 * Collect using `f : (K, A) => B` ordered by insertion order
 */
export function collect<K, A, B>(f: (k: K, a: A) => B) {
  return (m: Map<K, A>) => collect_(m, f)
}

/**
 * Lookup the value for a key in a `Map` using `Equal[K]`.
 */
export function getLookup<K>(
  E: Eq.Equal<K>
): (k: K) => <A>(m: Map<K, A>) => O.Option<A> {
  const le = getLookup_(E)
  return (k) => (m) => le(m, k)
}

/**
 * Lookup the value for a key in a `Map` using `Equal[K]`.
 */
export function getLookup_<K>(E: Eq.Equal<K>): <A>(m: Map<K, A>, k: K) => O.Option<A> {
  const lookupWithKeyE = getLookupWithKey_(E)
  return (m, k) => O.map_(lookupWithKeyE(m, k), ([_, a]) => a)
}

/**
 * Lookup the value for a key in a `Map` using strict equalty.
 */
export function lookup_<K, A>(m: Map<K, A>, k: K): O.Option<A> {
  return O.fromNullable(m.get(k))
}

/**
 * Lookup the value for a key in a `Map` using strict equalty.
 */
export function lookup<K>(k: K) {
  return <A>(m: Map<K, A>) => lookup_(m, k)
}

/**
 * Test whether or not a key exists in a map using `Equal[K]`
 */
export function getMember<K>(E: Eq.Equal<K>): (k: K) => <A>(m: Map<K, A>) => boolean {
  const gm = getMember_(E)
  return (k) => (m) => gm(m, k)
}

/**
 * Test whether or not a key exists in a map using `Equal[K]`
 */
export function getMember_<K>(E: Eq.Equal<K>): <A>(m: Map<K, A>, k: K) => boolean {
  const lookupE = getLookup_(E)
  return (m, k) => O.isSome(lookupE(m, k))
}

/**
 * Test whether or not a key exists in a map using strict equality
 */
export function member<K>(k: K): <A>(m: Map<K, A>) => boolean {
  return (m) => m.has(k)
}

/**
 * Test whether or not a key exists in a map using strict equality
 */
export function member_<K, A>(m: Map<K, A>, k: K): boolean {
  return m.has(k)
}

/**
 * Modifies value with key `K` using `Equal[K]`
 */
export function getModifyAt<K>(E: Eq.Equal<K>) {
  const mat = getModifyAt_(E)
  return <A>(k: K, f: (a: A) => A) => (m: Map<K, A>): O.Option<Map<K, A>> =>
    mat(m, k, f)
}

/**
 * Modifies value with key `K` using `Equal[K]`
 */
export function getModifyAt_<K>(
  E: Eq.Equal<K>
): <A>(m: Map<K, A>, k: K, f: (a: A) => A) => O.Option<Map<K, A>> {
  const lookupWithKeyE = getLookupWithKey_(E)
  return (m, k, f) => {
    const found = lookupWithKeyE(m, k)
    if (O.isNone(found)) {
      return O.none
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return O.some(r)
  }
}

/**
 * Modifies value with key `K`
 */
export function modifyAt_<K, A>(
  m: Map<K, A>,
  k: K,
  f: (a: A) => A
): O.Option<Map<K, A>> {
  const found = lookup_(m, k)
  if (O.isNone(found)) {
    return O.none
  }
  const r = new Map(m)
  r.set(found.value[0], f(found.value[1]))
  return O.some(r)
}

/**
 * Modifies value with key `K`
 */
export function modifyAt<K, A>(k: K, f: (a: A) => A) {
  return (m: Map<K, A>) => modifyAt_(m, k, f)
}

/**
 * Partition the map depending on the output of f
 */
export const partitionMapWithIndex = <K, A, B, C>(
  f: (k: K, a: A) => Either<B, C>
): ((fa: Map<K, A>) => Separated<Map<K, B>, Map<K, C>>) => {
  return (fa) => partitionMapWithIndex_(fa, f)
}

/**
 * Partition the map depending on the output of f
 */
export const partitionMapWithIndex_ = <K, A, B, C>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Either<B, C>
): Separated<Map<K, B>, Map<K, C>> => {
  const left = new Map<K, B>()
  const right = new Map<K, C>()
  const entries = fa.entries()
  let e: M.Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const ei = f(k, a)
    if (isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return {
    left,
    right
  }
}

/**
 * Partition the map depending on the output of f
 */
export const partitionWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: Map<K, A>) => Separated<Map<K, A>, Map<K, A>>) => {
  return (fa) => partitionWithIndex_(fa, p)
}

/**
 * Partition the map depending on the output of f
 */
export const partitionWithIndex_ = <K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
): Separated<Map<K, A>, Map<K, A>> => {
  const left = new Map<K, A>()
  const right = new Map<K, A>()
  const entries = fa.entries()
  let e: M.Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (p(k, a)) {
      right.set(k, a)
    } else {
      left.set(k, a)
    }
  }
  return {
    left,
    right
  }
}

/**
 * Partition the map depending on the predicate or refinement
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): <E>(fa: Map<E, A>) => Separated<Map<E, A>, Map<E, B>>
export function partition<A>(
  predicate: Predicate<A>
): <E>(fa: Map<E, A>) => Separated<Map<E, A>, Map<E, A>>
export function partition<A>(
  predicate: Predicate<A>
): <E>(fa: Map<E, A>) => Separated<Map<E, A>, Map<E, A>> {
  return (fa) => partition_(fa, predicate)
}

/**
 * Partition the map depending on the predicate or refinement
 */
export function partition_<E, A, B extends A>(
  fa: Map<E, A>,
  refinement: Refinement<A, B>
): Separated<Map<E, A>, Map<E, B>>
export function partition_<E, A>(
  fa: Map<E, A>,
  predicate: Predicate<A>
): Separated<Map<E, A>, Map<E, A>>
export function partition_<K, A>(fa: Map<K, A>, predicate: Predicate<A>) {
  return partitionWithIndex_(fa, (_, a) => predicate(a))
}

/**
 * Partition the map depending on the output of f
 */
export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: Map<E, A>) => Separated<Map<E, B>, Map<E, C>> = (f) =>
  partitionMapWithIndex((_, a) => f(a))

/**
 * Partition the map depending on the output of f
 */
export const partitionMap_: <E, A, B, C>(
  fa: Map<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<Map<E, B>, Map<E, C>> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function getPop<K>(
  E: Eq.Equal<K>
): (k: K) => <A>(m: Map<K, A>) => O.Option<readonly [A, Map<K, A>]> {
  return (k) => <A>(m: Map<K, A>) => getPop_(E)(m, k)
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function getPop_<K>(
  E: Eq.Equal<K>
): <A>(m: Map<K, A>, k: K) => O.Option<readonly [A, Map<K, A>]> {
  const lookupE = getLookup_(E)
  const deleteAtE = getDeleteAt(E)
  return (m, k) => {
    const deleteAtEk = deleteAtE(k)
    return O.map_(lookupE(m, k), (a) => [a, deleteAtEk(m)])
  }
}

/**
 * Delete a key and value from a map
 */
export function getDeleteAt<K>(
  E: Eq.Equal<K>
): (k: K) => <A>(m: Map<K, A>) => Map<K, A> {
  const da = getDeleteAt_(E)
  return (k) => (m) => da(m, k)
}

/**
 * Delete a key and value from a map
 */
export function getDeleteAt_<K>(E: Eq.Equal<K>): <A>(m: Map<K, A>, k: K) => Map<K, A> {
  const lookupWithKeyE = getLookupWithKey_(E)
  return (m, k) => {
    const found = lookupWithKeyE(m, k)
    if (O.isSome(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}

/**
 * Delete a key and value from a map
 */
export function deleteAt<K>(k: K): <A>(m: Map<K, A>) => Map<K, A> {
  return (m) => deleteAt_(m, k)
}

/**
 * Delete a key and value from a map
 */
export function deleteAt_<K, A>(m: Map<K, A>, k: K): Map<K, A> {
  const found = lookup_(m, k)
  if (O.isSome(found)) {
    const r = new Map(m)
    r.delete(found.value[0])
    return r
  }
  return m
}

/**
 * Test whether or not a value is a member of a map
 */
export function getElem<A>(E: Eq.Equal<A>): (a: A) => <K>(m: Map<K, A>) => boolean {
  return (a) => (m) => getElem_(E)(m, a)
}

/**
 * Test whether or not a value is a member of a map
 */
export function getElem_<A>(E: Eq.Equal<A>): <K>(m: Map<K, A>, a: A) => boolean {
  return (m, a) => {
    const values = m.values()
    let e: M.Next<A>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const v = e.value
      if (E.equals(v)(a)) {
        return true
      }
    }
    return false
  }
}

/**
 * Test whether or not a value is a member of a map
 */
export function elem<A>(a: A): <K>(m: Map<K, A>) => boolean {
  return (m) => elem_(m, a)
}

/**
 * Test whether or not a value is a member of a map
 */
export function elem_<K, A>(m: Map<K, A>, a: A): boolean {
  const values = m.values()
  let e: M.Next<A>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = values.next()).done) {
    const v = e.value
    if (v === a) {
      return true
    }
  }
  return false
}

/**
 * Filter elements
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Map<E, A>) => Map<E, B>
  <A>(predicate: Predicate<A>): <E>(fa: Map<E, A>) => Map<E, A>
} = <A>(predicate: Predicate<A>) => <E>(fa: Map<E, A>): Map<E, A> =>
  filter_(fa, predicate)

/**
 * Filter elements
 */
export const filter_: {
  <E, A, B extends A>(fa: Map<E, A>, refinement: Refinement<A, B>): Map<E, B>
  <E, A>(fa: Map<E, A>, predicate: Predicate<A>): Map<E, A>
} = <A, E>(fa: Map<E, A>, predicate: Predicate<A>): Map<E, A> =>
  M.filterWithIndex_(fa, (_, a) => predicate(a))

/**
 * Checks if d2 is a submap of d1 using `Equal[K]` and `Equal[A]`
 */
export function getIsSubmap<K>(SK: Eq.Equal<K>) {
  return <A>(SA: Eq.Equal<A>) => (d2: Map<K, A>) => (d1: Map<K, A>) =>
    getIsSubmap_(SK)(SA)(d1, d2)
}

/**
 * Checks if d2 is a submap of d1 using `Equal[K]` and `Equal[A]`
 */
export function getIsSubmap_<K>(
  SK: Eq.Equal<K>
): <A>(SA: Eq.Equal<A>) => (d1: Map<K, A>, d2: Map<K, A>) => boolean {
  return <A>(SA: Eq.Equal<A>) => {
    const lookupWithKeyS = getLookupWithKey_(SK)
    return (d1: Map<K, A>, d2: Map<K, A>): boolean => {
      const entries = d1.entries()
      let e: M.Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [k, a] = e.value
        const d2OptA = lookupWithKeyS(d2, k)
        if (
          O.isNone(d2OptA) ||
          !SK.equals(d2OptA.value[0])(k) ||
          !SA.equals(d2OptA.value[1])(a)
        ) {
          return false
        }
      }
      return true
    }
  }
}

/**
 * Checks if d2 is a submap of d1
 */
export function isSubmap_<K, A>(d1: Map<K, A>, d2: Map<K, A>): boolean {
  const entries = d1.entries()
  let e: M.Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const d2OptA = lookupWithKey_(d2, k)
    if (O.isNone(d2OptA) || d2OptA.value[0] === k || !(d2OptA.value[1] === a)) {
      return false
    }
  }
  return true
}

/**
 * Checks if d2 is a submap of d1
 */
export function isSubmap<K, A>(d2: Map<K, A>) {
  return (d1: Map<K, A>) => isSubmap_(d1, d2)
}

/**
 * The `Equal` instance for Map given equality of keys and values
 */
export function getEqual<K>(
  SK: Eq.Equal<K>
): <A>(SA: Eq.Equal<A>) => Eq.Equal<Map<K, A>> {
  return (SA) => {
    const isSubmap_ = getIsSubmap_(SK)(SA)
    return Eq.makeEqual((y) => (x) => isSubmap_(x, y) && isSubmap_(y, x))
  }
}

/**
 * Gets `Identity` instance for Maps given `Associative` instance for their values
 * and equality for keys
 */
export function getIdentity<K>(
  SK: Eq.Equal<K>
): <A>(SA: Associative<A>) => Identity<Map<K, A>> {
  return <A>(SA: Associative<A>) => {
    const lookupWithKeyS = getLookupWithKey_(SK)
    return makeIdentity(M.empty as Map<K, A>, (my) => (mx) => {
      if (mx === M.empty) {
        return my
      }
      if (my === M.empty) {
        return mx
      }
      const r = new Map(mx)
      const entries = my.entries()
      let e: M.Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [k, a] = e.value
        const mxOptA = lookupWithKeyS(mx, k)
        if (O.isSome(mxOptA)) {
          r.set(mxOptA.value[0], SA.combine(a)(mxOptA.value[1]))
        } else {
          r.set(k, a)
        }
      }
      return r
    })
  }
}

/**
 * Gets `Identity` instance for Maps given `Associative` instance for their values
 */
export function getIdentityStrict<A>(SA: Associative<A>): <K>() => Identity<Map<K, A>> {
  return <K>() =>
    makeIdentity(M.empty as Map<K, A>, (my) => (mx) => {
      if (mx === M.empty) {
        return my
      }
      if (my === M.empty) {
        return mx
      }
      const r = new Map(mx)
      const entries = my.entries()
      let e: M.Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [k, a] = e.value
        const mxOptA = lookupWithKey_(mx, k)
        if (O.isSome(mxOptA)) {
          r.set(mxOptA.value[0], SA.combine(a)(mxOptA.value[1]))
        } else {
          r.set(k, a)
        }
      }
      return r
    })
}

/**
 * Gets `Show` instance for Maps given `Show` instance for their keys & values
 */
export function getShow<K>(SK: Show<K>): <A>(SA: Show<A>) => Show<Map<K, A>> {
  return (SA) =>
    makeShow((m) => {
      let elements = ""
      m.forEach((a, k) => {
        elements += `[${SK.show(k)}, ${SA.show(a)}], `
      })
      if (elements !== "") {
        elements = elements.substring(0, elements.length - 2)
      }
      return `new Map([${elements}])`
    })
}
