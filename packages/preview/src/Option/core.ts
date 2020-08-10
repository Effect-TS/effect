import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeCovariant } from "../_abstract/Covariant"
import * as O from "../_system/Option"

/**
 * Typelevel map entries
 */
export const OptionURI = "Option"
export type OptionURI = typeof OptionURI

declare module "../_abstract/HKT" {
  interface URItoKind<K extends string, SI, SO, X, I, S, Env, Err, Out> {
    [OptionURI]: O.Option<Out>
  }
}

/**
 * The `Any` instance for `Option[+_]`
 */
export const Any = makeAny(OptionURI)({
  any: () => O.some({})
})

/**
 * The `Covariant` instance for `Option[+_]`
 */
export const Covariant = makeCovariant(OptionURI)({
  map: O.map
})

/**
 * The `AssociativeBoth` instance for `Option[+_]`
 */
export const AssociativeBoth = makeAssociativeBoth(OptionURI)({
  both: O.zip
})
