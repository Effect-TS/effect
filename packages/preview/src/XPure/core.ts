import { constant } from "../Function"
import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeEither } from "../_abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { sequenceSF } from "../_abstract/DSL"
import { makeAccess } from "../_abstract/FX/Access"
import { makeFail } from "../_abstract/FX/Fail"
import { makeIdentityBoth } from "../_abstract/IdentityBoth"
import * as X from "../_system/XPure"

/**
 * Typelevel map entries
 */
export const XPureSuccessURI = "XPureSuccess"
export type XPureSuccessURI = typeof XPureSuccessURI

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

/**
 * The `AssociativeEither` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const AssociativeEither = makeAssociativeEither(XPureSuccessURI)({
  either: X.orElseEither
})

/**
 * The `Access` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Access = makeAccess(XPureSuccessURI)({
  access: X.access,
  provide: X.provideAll
})

/**
 * The `Fail` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Fail = makeFail(XPureSuccessURI)({
  fail: X.fail
})

/**
 * The `IdentityBoth` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const IdentityBoth = makeIdentityBoth(XPureSuccessURI)(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Applicative = makeApplicative(XPureSuccessURI)(
  intersect(IdentityBoth, Covariant)
)

/**
 * The `AssociativeFlatten` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const AssociativeFlatten = makeAssociativeFlatten(XPureSuccessURI)({
  flatten: (fa) => X.chain_(fa, (x) => x)
})

/**
 * Struct based `Applicative`
 */
export const sequenceS = sequenceSF(Applicative)
