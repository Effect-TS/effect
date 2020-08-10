import { pipe } from "../Function"
import { makeAny } from "../_abstract/Any"
import { makeCovariant } from "../_abstract/Covariant"
import { anyF } from "../_abstract/DSL"
import { Ord } from "../_abstract/Ord"
import {
  ForeachKE,
  implementForeachF,
  implementForeachFE,
  makeTraversable,
  makeTraversableE
} from "../_abstract/Traversable"
import * as M from "../_system/Map/core"

import { getKeys } from "./core"

export const MapValueURI = "MapValue"
export type MapValueURI = typeof MapValueURI

declare module "../_abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
    [MapValueURI]: M.Map<Err, Out>
  }
}

/**
 * The `Any` instance for `Map[+_, +_]`
 */
export const Any = makeAny(MapValueURI)({
  any: () => M.empty
})

/**
 * The `Covariant` instance for `Map[+_, +_]`
 */
export const Covariant = makeCovariant(MapValueURI)({
  map: M.map
})

/**
 * Traversable's foreachF for Map[+_, _+].
 */
export const foreachF = implementForeachF(MapValueURI)(
  ({ _a, _b, _ferr }) => (G) => (f) => (fa) => {
    let fm = anyF(G)<M.Map<typeof _ferr, typeof _b>>(M.empty)

    const entries = fa.entries()
    let e: M.Next<readonly [typeof _ferr, typeof _a]>
    while (!(e = entries.next()).done) {
      const [key, a] = e.value
      fm = pipe(
        fm,
        G.map((m) => (b: typeof _b) => new Map(m).set(key, b)),
        G.both(f(a)),
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
 * The `Traversable` instance for `Map[+_, +_]` with order enstablished via `Ord[K]`
 */
export const getTraversable = <K>(O: Ord<K>) =>
  makeTraversableE(Covariant)<K>()({
    foreachF: getForeachF<K>(O)
  })

/**
 * Traversable's foreachF for Map[K, _+] given Ord[K].
 */
export function getForeachF<K>(O: Ord<K>): ForeachKE<MapValueURI, K> {
  return implementForeachFE(MapValueURI)<K>()(({ _b }) => (G) => (f) => (fa) => {
    let fm = anyF(G)<M.Map<K, typeof _b>>(M.empty)
    const ks = getKeys(O)(fa)
    for (const key of ks) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const a = fa.get(key)!
      fm = pipe(
        fm,
        G.map((m) => (b: typeof _b) => new Map(m).set(key, b)),
        G.both(f(a)),
        G.map(([g, b]) => g(b))
      )
    }

    return fm
  })
}
