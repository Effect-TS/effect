import { makeAny } from "../_abstract/Any"
import { makeCovariant } from "../_abstract/Covariant"
import * as M from "../_system/Map/core"

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
