import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeEither } from "../_abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { makeAccess } from "../_abstract/FX/Access"
import { makeEnvironmental } from "../_abstract/FX/Environmental"
import { makeFail } from "../_abstract/FX/Fail"
import { makeRecover } from "../_abstract/FX/Recover"
import { makeRun } from "../_abstract/FX/Run"
import { makeIdentityBoth } from "../_abstract/IdentityBoth"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import * as T from "../_system/Effect"

/**
 * @category definitions
 */

export type EffectURI = typeof T.EffectURI

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
    [T.EffectURI]: T.Effect<X, Env, Err, Out>
  }
}

/**
 * The `Covariant` instance for `Effect`.
 */
export const Covariant = makeCovariant<T.EffectURI>()()({
  map: T.map
})

/**
 * The `Any` instance for `Effect`.
 */
export const Any = makeAny<T.EffectURI>()()({
  any: () => T.of
})

/**
 * The `AssociativeBoth` instance for `Effect`.
 */
export const AssociativeBoth = makeAssociativeBoth<T.EffectURI>()()({
  both: (fb) => (fa) => T.zip_(fa, fb)
})

/**
 * The `IdentityBoth` instance for `Effect`.
 */
export const IdentityBoth = makeIdentityBoth<T.EffectURI>()()(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `Effect`.
 */
export const Applicative = makeApplicative<T.EffectURI>()()(
  intersect(Covariant, IdentityBoth)
)

/**
 * The `AssociativeEither` instance for `Effect`.
 */
export const AssociativeEither = makeAssociativeEither<T.EffectURI>()()({
  either: T.orElseEither
})

/**
 * The `AssociativeFlatten` instance for `Effect`.
 */
export const AssociativeFlatten = makeAssociativeFlatten<T.EffectURI>()()({
  flatten: T.flatten
})

/**
 * The `Access` instance for `Effect`.
 */
export const Access = makeAccess<T.EffectURI>()()({
  access: T.access,
  provide: T.provideAll
})

/**
 * The `IdentityFlatten` instance for `Effect`.
 */
export const IdentityFlatten = makeIdentityFlatten<T.EffectURI>()()(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Environmental` instance for `Effect`.
 */
export const Environmental = makeEnvironmental<T.EffectURI>()()(
  intersect(Access, IdentityFlatten, Covariant)
)

/**
 * The `Monad` instance for `Effect`.
 */
export const Monad = makeMonad<T.EffectURI>()()(intersect(Covariant, IdentityFlatten))

/**
 * The `Fail` instance for `Effect`.
 */
export const Fail = makeFail<T.EffectURI>()()({
  fail: T.fail
})

/**
 * The `Recover` instance for `Effect`.
 */
export const Recover = makeRecover<T.EffectURI>()()({
  recover: T.catchAll
})

/**
 * The `Run` instance for `Effect`.
 */
export const Run = makeRun<T.EffectURI>()()({
  run: T.either
})
