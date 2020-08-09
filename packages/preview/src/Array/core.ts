import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeCovariant } from "../_abstract/Covariant"
import * as A from "../_system/Array"

/**
 * Typelevel map entries
 */
export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../_abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
    [ArrayURI]: A.Array<Out>
  }
}

/**
 * The `Any` instance for `Array[+_]`
 */
export const Any = makeAny(ArrayURI)({
  any: () => A.empty
})

/**
 * The `Covariant` instance for `Array[+_]`
 */
export const Covariant = makeCovariant(ArrayURI)({
  map: A.map
})

/**
 * The `AssociativeBoth` instance for `Array[+_]`
 */
export const AssociativeBoth = makeAssociativeBoth(ArrayURI)({
  both: A.zip
})
