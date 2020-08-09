import { makeAny } from "../abstract/Any"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeCovariant } from "../abstract/Covariant"
import * as O from "../system/Option"

/**
 * Typelevel map entries
 */
export const OptionURI = "Option"
export type OptionURI = typeof OptionURI

declare module "../abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
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
