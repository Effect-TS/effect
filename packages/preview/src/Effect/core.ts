import { intersect } from "../Utils"
import { AnyK } from "../_abstract/Any"
import { ApplicativeK } from "../_abstract/Applicative"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { AssociativeEitherK } from "../_abstract/AssociativeEither"
import { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import { CovariantK } from "../_abstract/Covariant"
import { AccessK } from "../_abstract/FX/Access"
import { EnvironmentalK } from "../_abstract/FX/Environmental"
import { FailK } from "../_abstract/FX/Fail"
import { RecoverK } from "../_abstract/FX/Recover"
import { RunK } from "../_abstract/FX/Run"
import { instance } from "../_abstract/HKT"
import { IdentityBothK } from "../_abstract/IdentityBoth"
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
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
export const Covariant = instance<CovariantK<T.EffectURI>>({
  map: T.map
})

/**
 * The `Any` instance for `Effect`.
 */
export const Any = instance<AnyK<T.EffectURI>>({
  any: () => T.of
})

/**
 * The `AssociativeBoth` instance for `Effect`.
 */
export const AssociativeBoth = instance<AssociativeBothK<T.EffectURI>>({
  both: T.zip
})

/**
 * The `IdentityBoth` instance for `Effect`.
 */
export const IdentityBoth = instance<IdentityBothK<T.EffectURI>>(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `Effect`.
 */
export const Applicative = instance<ApplicativeK<T.EffectURI>>(
  intersect(Covariant, IdentityBoth)
)

/**
 * The `AssociativeEither` instance for `Effect`.
 */
export const AssociativeEither = instance<AssociativeEitherK<T.EffectURI>>({
  either: T.orElseEither
})

/**
 * The `AssociativeFlatten` instance for `Effect`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<T.EffectURI>>({
  flatten: T.flatten
})

/**
 * The `Access` instance for `Effect`.
 */
export const Access = instance<AccessK<T.EffectURI>>({
  access: T.access,
  provide: T.provideAll
})

/**
 * The `IdentityFlatten` instance for `Effect`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<T.EffectURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Environmental` instance for `Effect`.
 */
export const Environmental = instance<EnvironmentalK<T.EffectURI>>(
  intersect(Access, IdentityFlatten, Covariant)
)

/**
 * The `Monad` instance for `Effect`.
 */
export const Monad = instance<MonadK<T.EffectURI>>(
  intersect(Covariant, IdentityFlatten)
)

/**
 * The `Fail` instance for `Effect`.
 */
export const Fail = instance<FailK<T.EffectURI>>({
  fail: T.fail
})

/**
 * The `Recover` instance for `Effect`.
 */
export const Recover = instance<RecoverK<T.EffectURI>>({
  recover: T.catchAll
})

/**
 * The `Run` instance for `Effect`.
 */
export const Run = instance<RunK<T.EffectURI>>({
  run: T.either
})
