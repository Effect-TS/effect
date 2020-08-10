import { makeAny } from "../_abstract/Any"
import { makeCovariant } from "../_abstract/Covariant"
import * as R from "../_system/Record"

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

declare module "../_abstract/HKT" {
  interface URItoKind<K extends string, SI, SO, X, I, S, Env, Err, Out> {
    [RecordURI]: R.Record<K, Out>
  }
}

/**
 * The `Any` instance for `Record[+_: String, +_]`
 */
export const Any = makeAny(RecordURI)({
  any: () => ({})
})

/**
 * The `Covariant` instance for `Record[+_: String, +_]`
 */
export const Covariant = makeCovariant(RecordURI)({
  map: R.map
})
