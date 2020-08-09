import { intersect } from "../Utils"
import { makeAny } from "../abstract/Any"
import { makeApplicative, sequenceSF } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeEither } from "../abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeAccess } from "../abstract/Fx/Access"
import { makeFail } from "../abstract/Fx/Fail"
import { makeIdentityBoth } from "../abstract/IdentityBoth"

import * as F from "./core"

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI

declare module "../abstract/HKT" {
  interface URItoKindEx<SI, SO, X, I, S, Env, Err, Out> {
    [XPureURI]: F.XPure<SI, SO, Env, Err, Out>
  }
}

/**
 * The `Any` instance for `XPure`.
 */
export const Any = makeAny(XPureURI)({
  any: F.succeed({})
})

/**
 * The `AssociativeBoth` instance for `XPure`.
 */
export const AssociativeBoth = makeAssociativeBoth(XPureURI)({
  both: F.zip
})

/**
 * The `AssociativeEither` instance for `XPure`.
 */
export const AssociativeEither = makeAssociativeEither(XPureURI)({
  either: F.orElseEither
})

/**
 * The `Covariant` instance for `XPure`.
 */
export const Covariant = makeCovariant(XPureURI)({
  map: F.map
})

/**
 * The `Access` instance for `XPure`.
 */
export const Access = makeAccess(XPureURI)({
  access: F.access,
  provide: F.provideAll
})

/**
 * The `Fail` instance for `XPure`.
 */
export const Fail = makeFail(XPureURI)({
  fail: F.fail
})

/**
 * The `IdentityBoth` instance for `XPure`.
 */
export const IdentityBoth = makeIdentityBoth(XPureURI)(intersect(Any, AssociativeBoth))

/**
 * The `Applicative` instance for `XPure`.
 */
export const Applicative = makeApplicative(XPureURI)(intersect(IdentityBoth, Covariant))

/**
 * The `AssociativeFlatten` instance for `XPure`
 */
export const AssociativeFlatten = makeAssociativeFlatten(XPureURI)({
  flatten: (fa) => F.chain_(fa, (x) => x)
})

/**
 * Struct based `Applicative`
 */
export const sequenceS = sequenceSF(Applicative)

/**
 * Core exports
 */
export {
  access,
  accessM,
  bimap,
  bimap_,
  catchAll,
  catchAll_,
  chain,
  chain_,
  provideSome,
  contramapInput,
  environment,
  fail,
  foldM,
  foldM_,
  map,
  mapError,
  mapError_,
  map_,
  modify,
  provideAll,
  run,
  runEither,
  runIO,
  runResult,
  runResult_,
  runState,
  runStateEither,
  runStateEither_,
  runStateResult,
  runStateResult_,
  runState_,
  run_,
  succeed,
  tap,
  tap_,
  unit,
  update,
  XPure,
  zip,
  zipWith,
  zipWith_,
  zip_,
  either,
  fold,
  fold_
} from "./core"
