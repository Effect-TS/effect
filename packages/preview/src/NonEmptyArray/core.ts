import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeCovariant } from "../_abstract/Covariant"
import * as A from "../_system/NonEmptyArray"

/**
 * Typelevel map entries
 */
export const NonEmptyArrayURI = "NonEmptyArray"
export type NonEmptyArrayURI = typeof NonEmptyArrayURI

declare module "../_abstract/HKT" {
  interface URItoKind<K, NK extends string, SI, SO, X, I, S, Env, Err, Out> {
    [NonEmptyArrayURI]: A.NonEmptyArray<Out>
  }
}

/**
 * The `Any` instance for `NonEmptyArray[+_]`
 */
export const Any = makeAny(NonEmptyArrayURI)({
  any: () => A.single({})
})

/**
 * The `Covariant` instance for `NonEmptyArray[+_]`
 */
export const Covariant = makeCovariant(NonEmptyArrayURI)({
  map: A.map
})

/**
 * The `AssociativeBoth` instance for `NonEmptyArray[+_]`
 */
export const AssociativeBoth = makeAssociativeBoth(NonEmptyArrayURI)({
  both: A.zip
})
