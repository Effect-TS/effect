import * as T from "@effect-ts/system/Effect"

import type { AnyK } from "../_abstract/Any"
import type { ApplicativeK } from "../_abstract/Applicative"
import type { AssociativeBothK } from "../_abstract/AssociativeBoth"
import type { AssociativeEitherK } from "../_abstract/AssociativeEither"
import type { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import type { CovariantK } from "../_abstract/Covariant"
import type { AccessK } from "../_abstract/FX/Access"
import type { EnvironmentalK } from "../_abstract/FX/Environmental"
import type { FailK } from "../_abstract/FX/Fail"
import type { RecoverK } from "../_abstract/FX/Recover"
import type { RunK } from "../_abstract/FX/Run"
import { instance } from "../_abstract/HKT"
import type { IdentityBothK } from "../_abstract/IdentityBoth"
import type { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import type { MonadK } from "../_abstract/Monad"
import { intersect } from "../Utils"

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
