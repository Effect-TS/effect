import { intersect } from "../Utils"
import { makeAccess } from "../abstract/Access"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeContravariantEnv } from "../abstract/ContravariantEnv"
import { makeContravariantInput } from "../abstract/ContravariantInput"
import { makeCovariant } from "../abstract/Covariant"
import { makeMonad } from "../abstract/Monad"

import * as F from "./core"

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI

export const StateReaderErrorURI = "StateReaderError"
export type StateReaderErrorURI = typeof StateReaderErrorURI

declare module "../abstract/HKT" {
  interface URItoKind5<In, St, Env, Err, Out> {
    [XPureURI]: F.XPure<In, St, Env, Err, Out>
  }
  interface URItoKind4<St, Env, Err, Out> {
    [StateReaderErrorURI]: F.XPure<St, St, Env, Err, Out>
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
 * The `AssociativeBoth` instance for `StateReaderError`.
 */
export const AssociativeBoth = makeAssociativeBoth(StateReaderErrorURI)({
  both: F.zip
})

/**
 * The `AssociativeBoth` instance for `StateReaderError`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(StateReaderErrorURI)({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `Access` instance for `XPure`.
 */
export const Access = makeAccess(XPureURI)({
  access: F.access,
  provide: F.provideAll
})

/**
 * The `Monad` instance for `StateReaderError`.
 */
export const Monad = makeMonad(StateReaderErrorURI)(
  intersect(Any, Covariant, AssociativeFlatten)
)

/**
 * The `Applicative` instance for `StateReaderError`.
 */
export const Applicative = makeApplicative(StateReaderErrorURI)(
  intersect(Any, AssociativeBoth, Covariant)
)

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
  contramapInput as contramapState,
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
  runState_,
  run_,
  succeed,
  unit,
  update,
  XPure,
  zip,
  zipWith,
  zipWith_,
  zip_
} from "./core"
