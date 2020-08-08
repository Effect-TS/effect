import { makeAny } from "../abstract/Any"
import { makeContravariantEnv } from "../abstract/ContravariantEnv"
import { makeContravariantInput } from "../abstract/ContravariantInput"
import { makeCovariant } from "../abstract/Covariant"
import { makeAccess } from "../abstract/Fx/Access"
import { makeFail } from "../abstract/Fx/Fail"

import * as F from "./core"

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI

declare module "../abstract/HKT" {
  interface URItoKind<X, In, St, Env, Err, Out> {
    [XPureURI]: F.XPure<In, St, Env, Err, Out>
  }
}

/**
 * The `Any` instance for `XPure`.
 */
export const Any = makeAny(XPureURI)({
  any: () => F.succeed({})
})

/**
 * The `Covariant` instance for `XPure`.
 */
export const Covariant = makeCovariant(XPureURI)({
  map: F.map
})

/**
 * The `Contravariant` instance for `XPure[x, S2, R, E, A]`
 */
export const ContravariantInput = makeContravariantInput(XPureURI)({
  contramapInput: F.contramapInput
})

/**
 * The `Contravariant` instance for `XPure[S1, S2, x, E, A]`
 */
export const ContravariantEnv = makeContravariantEnv(XPureURI)({
  contramapEnv: F.contramapEnv
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
  contramapEnv,
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
  zip_
} from "./core"
