import { constant } from "../Function"
import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeCovariant } from "../_abstract/Covariant"
import * as X from "../_system/XPure"

/**
 * Typelevel map entries
 */
export const XPureSuccessURI = "XPureSuccess"
export type XPureSuccessURI = typeof XPureSuccessURI

declare module "../_abstract/HKT" {
  interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {
    [XPureSuccessURI]: X.XPure<SI, SO, Env, Err, Out>
  }
}

/**
 * The `Any` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const Any = makeAny(XPureSuccessURI)({
  any: () => X.succeed(constant({}))
})

/**
 * The `Covariant` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const Covariant = makeCovariant(XPureSuccessURI)({
  map: X.map
})

/**
 * The `AssociativeBoth` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const AssociativeBoth = makeAssociativeBoth(XPureSuccessURI)({
  both: X.zip
})
