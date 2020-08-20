import * as X from "@effect-ts/system/XPure"

import type { AnyK } from "../_abstract/Any"
import type { ApplicativeK } from "../_abstract/Applicative"
import type { AssociativeBothK } from "../_abstract/AssociativeBoth"
import type { AssociativeEitherK } from "../_abstract/AssociativeEither"
import type { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import type { CovariantK } from "../_abstract/Covariant"
import { sequenceSF } from "../_abstract/DSL"
import type { AccessK } from "../_abstract/FX/Access"
import type { FailK } from "../_abstract/FX/Fail"
import type { RecoverK } from "../_abstract/FX/Recover"
import { instance } from "../_abstract/HKT"
import type { IdentityBothK } from "../_abstract/IdentityBoth"
import type { MonadK } from "../_abstract/Monad"
import { constant, identity } from "../Function"
import { intersect } from "../Utils"

/**
 * Typelevel map entries
 */
export const XPureSuccessURI = "XPureSuccess"
export type XPureSuccessURI = typeof XPureSuccessURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
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
export const Any = instance<AnyK<XPureSuccessURI>>({
  any: () => X.succeed(constant({}))
})

/**
 * The `Covariant` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const Covariant = instance<CovariantK<XPureSuccessURI>>({
  map: X.map
})

/**
 * The `AssociativeBoth` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const AssociativeBoth = instance<AssociativeBothK<XPureSuccessURI>>({
  both: X.zip
})

/**
 * The `AssociativeEither` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const AssociativeEither = instance<AssociativeEitherK<XPureSuccessURI>>({
  either: X.orElseEither
})

/**
 * The `Access` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Access = instance<AccessK<XPureSuccessURI>>({
  access: X.access,
  provide: X.provideAll
})

/**
 * The `Fail` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Fail = instance<FailK<XPureSuccessURI>>({
  fail: X.fail
})

/**
 * The `Recover` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Recover = instance<RecoverK<XPureSuccessURI>>({
  recover: X.catchAll
})

/**
 * The `IdentityBoth` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const IdentityBoth = instance<IdentityBothK<XPureSuccessURI>>(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `XPure[-_, +_, -_, +_, +_]`.
 */
export const Applicative = instance<ApplicativeK<XPureSuccessURI>>(
  intersect(IdentityBoth, Covariant)
)

/**
 * The `AssociativeFlatten` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<XPureSuccessURI>>({
  flatten: (fa) => X.chain_(fa, identity)
})

/**
 * Struct based `Applicative`
 */
export const sequenceS = sequenceSF(Applicative)

/**
 * The `Monad` instance for `XPure[-_, +_, -_, +_, +_]`
 */
export const Monad = instance<MonadK<XPureSuccessURI>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})
