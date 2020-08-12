import { pipe } from "../Function"
import { makeAny } from "../_abstract/Any"
import { makeCovariant } from "../_abstract/Covariant"
import { anyF } from "../_abstract/DSL"
import { Ord } from "../_abstract/Ord"
import { implementForeachF, makeTraversable } from "../_abstract/Traversable"
import {
  implementForeachWithKeysF,
  makeTraversableWithKeys
} from "../_abstract/TraversableWithKeys"
import * as M from "../_system/Map/core"

import { getKeys } from "./core"

export const MapURI = "Map"
export type MapURI = typeof MapURI

export const MapFixedURI = "MapFixed"
export type MapFixedURI = typeof MapFixedURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [MapURI]: M.Map<K, Out>
    [MapFixedURI]: M.Map<Fix0, Out>
  }
  interface URItoKeys<
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [MapURI]: K
    [MapFixedURI]: Fix0
  }
}

/**
 * The `Any` instance for `Map[+_, +_]`
 */
export const Any = makeAny(MapURI)({
  any: () => M.empty
})

/**
 * The `Covariant` instance for `Map[+_, +_]`
 */
export const Covariant = makeCovariant(MapURI)({
  map: M.map
})

/**
 * The `Covariant` instance for `Map[K, +_]`
 */
export const getCovariant = <K>() =>
  makeCovariant<MapFixedURI, K>(MapFixedURI)({
    map: M.map
  })

/**
 * Traversable's foreachF for Map[+_, _+].
 */
export const foreachF = implementForeachF(MapURI)((_) => (G) => (f) => (fa) => {
  let fm = anyF(G)<M.Map<typeof _.FK, typeof _.B>>(M.empty)

  const entries = fa.entries()
  let e: M.Next<readonly [typeof _.FK, typeof _.A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    fm = pipe(
      fm,
      G.map((m) => (b: typeof _.B) => new Map(m).set(key, b)),
      G.both(f(a)),
      G.map(([g, b]) => g(b))
    )
  }

  return fm
})

/**
 * TraversableWithKeys's foreachF for Map[+_, _+].
 */
export const foreachWithKeysF = implementForeachWithKeysF(MapURI)(
  ({ _a, _b, _fk }) => (G) => (f) => (fa) => {
    let fm = anyF(G)<M.Map<typeof _fk, typeof _b>>(M.empty)

    const entries = fa.entries()
    let e: M.Next<readonly [typeof _fk, typeof _a]>
    while (!(e = entries.next()).done) {
      const [key, a] = e.value
      fm = pipe(
        fm,
        G.map((m) => (b: typeof _b) => new Map(m).set(key, b)),
        G.both(f(a, key)),
        G.map(([g, b]) => g(b))
      )
    }

    return fm
  }
)

/**
 * The `Traversable` instance for `Map[+_, +_]` in insertion order
 */
export const Traversable = makeTraversable(Covariant)({
  foreachF
})

/**
 * The `TraversableWithKeys` instance for `Map[+_, +_]` in insertion order
 */
export const TraversableWithKeys = makeTraversableWithKeys(Covariant)({
  foreachWithKeysF
})

/**
 * The `Traversable` instance for `Map[+_, +_]` with order enstablished via `Ord[K]`
 */
export const getTraversable = <K>(O: Ord<K>) =>
  makeTraversable(getCovariant<K>())({
    foreachF: makeForeachF<K>(O)
  })

/**
 * The `TraversableWithKeys` instance for `Map[+_, +_]` with order enstablished via `Ord[K]`
 */
export const getTraversableWithKeys = <K>(O: Ord<K>) =>
  makeTraversableWithKeys(getCovariant<K>())({
    foreachWithKeysF: makeForeachWithKeysF<K>(O)
  })

/**
 * Traversable's foreachF for Map[K, _+] given Ord[K].
 */
export function makeForeachF<K>(O: Ord<K>) {
  return implementForeachF<MapFixedURI, K>(MapFixedURI)(() => (G) => (f) =>
    makeForeachWithKeysF(O)(G)((a) => f(a))
  )
}

/**
 * TraversableWithKeys's foreachWithKeysF for Map[K, _+] given Ord[K].
 */
export function makeForeachWithKeysF<K>(O: Ord<K>) {
  return implementForeachWithKeysF<MapFixedURI, K>(MapFixedURI)(
    ({ _b }) => (G) => (f) => (fa) => {
      let fm = anyF(G)<M.Map<K, typeof _b>>(M.empty)
      const ks = getKeys(O)(fa)
      for (const key of ks) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const a = fa.get(key)!
        fm = pipe(
          fm,
          G.map((m) => (b: typeof _b) => new Map(m).set(key, b)),
          G.both(f(a, key)),
          G.map(([g, b]) => g(b))
        )
      }

      return fm
    }
  )
}
