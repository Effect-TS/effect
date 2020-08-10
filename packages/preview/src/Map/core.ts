import { pipe, tuple, tupled } from "../Function"
import * as O from "../Option"
import { Equal } from "../_abstract/Equal"
import { Ord } from "../_abstract/Ord"
import * as Ordering from "../_abstract/Ordering"
import * as M from "../_system/Map/core"
import { MutableArray } from "../_system/Mutable"

/**
 * Lookup key `K` returning `Option[(K, A)]` using strict equality of keys
 */
export function lookupWithKey_<K, A>(m: M.Map<K, A>, k: K): O.Option<readonly [K, A]> {
  return pipe(
    O.fromNullable(m.get(k)),
    O.map((a) => tuple(k, a))
  )
}

/**
 * Lookup key `K` returning `Option[(K, A)]` using strict equality of keys
 */
export function lookupWithKey<K>(k: K) {
  return <A>(m: M.Map<K, A>) => lookupWithKey_(m, k)
}

/**
 * Lookup key `K` returning `Option[(K, A)]` using `Equal[K]`
 */
export function getLookupWithKey_<K>(
  E: Equal<K>
): <A>(m: M.Map<K, A>, k: K) => O.Option<readonly [K, A]> {
  return <A>(m: M.Map<K, A>, k: K) => {
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
export function getLookupWithKey<K>(E: Equal<K>) {
  const ge = getLookupWithKey_(E)
  return (k: K) => <A>(m: M.Map<K, A>) => ge(m, k)
}

/**
 * Insert element `(K, A)` using `Equal[A]`
 */
export function getInsertAt_<K>(
  E: Equal<K>
): <A>(m: M.Map<K, A>, k: K, a: A) => M.Map<K, A> {
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
  E: Equal<K>
): <A>(k: K, a: A) => (m: M.Map<K, A>) => M.Map<K, A> {
  const gia = getInsertAt_(E)
  return (k, a) => (m) => gia(m, k, a)
}

/**
 * Insert element `(K, A)` using strict equality
 */
export function insertAt<K, A>(k: K, a: A): (m: M.Map<K, A>) => M.Map<K, A> {
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
export function getKeys<K>(O: Ord<K>): <A>(m: M.Map<K, A>) => Array<K> {
  return (m) => Array.from(m.keys()).sort((l, r) => Ordering.toNumber(O.compare(r)(l)))
}

/**
 * Get the map keys ordered by insertion time
 */
export function keys<K, A>(m: M.Map<K, A>): Array<K> {
  return Array.from(m.keys())
}

/**
 * Collect using `f : (K, A) => B` ordered by `Ord[K]`
 */
export function getCollect_<K>(
  O: Ord<K>
): <A, B>(m: M.Map<K, A>, f: (k: K, a: A) => B) => Array<B> {
  const keysO = getKeys(O)
  return <A, B>(m: M.Map<K, A>, f: (k: K, a: A) => B): Array<B> => {
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
  return <A, B>(f: (k: K, a: A) => B) => (m: M.Map<K, A>) => gc(m, f)
}

/**
 * Collect using `f : (K, A) => B` ordered by insertion order
 */
export function collect_<K, A, B>(m: M.Map<K, A>, f: (k: K, a: A) => B): Array<B> {
  return Array.from(m).map(tupled(f))
}

/**
 * Collect using `f : (K, A) => B` ordered by insertion order
 */
export function collect<K, A, B>(f: (k: K, a: A) => B) {
  return (m: M.Map<K, A>) => collect_(m, f)
}

/**
 * Lookup the value for a key in a `Map` using `Equal[K]`.
 */
export function getLookup<K>(E: Equal<K>): (k: K) => <A>(m: Map<K, A>) => O.Option<A> {
  const le = getLookup_(E)
  return (k) => (m) => le(m, k)
}

/**
 * Lookup the value for a key in a `Map` using `Equal[K]`.
 */
export function getLookup_<K>(E: Equal<K>): <A>(m: Map<K, A>, k: K) => O.Option<A> {
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
export function getMember<K>(E: Equal<K>): (k: K) => <A>(m: Map<K, A>) => boolean {
  const gm = getMember_(E)
  return (k) => (m) => gm(m, k)
}

/**
 * Test whether or not a key exists in a map using `Equal[K]`
 */
export function getMember_<K>(E: Equal<K>): <A>(m: Map<K, A>, k: K) => boolean {
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
