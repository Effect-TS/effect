import { pipe, tuple } from "../Function"
import * as O from "../Option"
import { Equal } from "../_abstract/Equal"
import { Next } from "../_system/Map/core"

export function lookupWithKey_<K, A>(m: Map<K, A>, k: K): O.Option<readonly [K, A]> {
  return pipe(
    O.fromNullable(m.get(k)),
    O.map((a) => tuple(k, a))
  )
}

export function lookupWithKey<K>(k: K) {
  return <A>(m: Map<K, A>) => lookupWithKey_(m, k)
}

export function getLookupWithKey_<K>(
  E: Equal<K>
): <A>(m: Map<K, A>, k: K) => O.Option<readonly [K, A]> {
  return <A>(m: Map<K, A>, k: K) => {
    const entries = m.entries()
    let e: Next<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals(k)(ka)) {
        return O.some([ka, a])
      }
    }
    return O.none
  }
}

export function getLookupWithKey<K>(E: Equal<K>) {
  const ge = getLookupWithKey_(E)
  return (k: K) => <A>(m: Map<K, A>) => ge(m, k)
}

export function getInsertAt_<K>(
  E: Equal<K>
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

export function getInsertAt<K>(
  E: Equal<K>
): <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A> {
  const gia = getInsertAt_(E)
  return (k, a) => (m) => gia(m, k, a)
}

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
