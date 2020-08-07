import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeContravariant } from "../abstract/Contravariant"
import { makeCovariant } from "../abstract/Covariant"
import { makeEnvironmental } from "../abstract/Environmental"
import { makeMonad } from "../abstract/Monad"

import * as F from "./core"

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI

export const XPureInputURI = "XPureInput"
export type XPureInputURI = typeof XPureInputURI

export const XPureEnvURI = "XPureEnv"
export type XPureEnvURI = typeof XPureEnvURI

export const StateReaderErrorURI = "StateReaderError"
export type StateReaderErrorURI = typeof StateReaderErrorURI

declare module "../abstract/HKT" {
  interface URItoKind5<X, S, R, E, A> {
    [XPureURI]: F.XPure<X, S, R, E, A>
  }
  interface URItoKind5<X, S, R, E, A> {
    [XPureEnvURI]: F.XPure<X, S, A, E, R>
  }
  interface URItoKind5<X, S, R, E, A> {
    [XPureInputURI]: F.XPure<A, S, R, E, X>
  }
  interface URItoKind4<S, R, E, A> {
    [StateReaderErrorURI]: F.XPure<S, S, R, E, A>
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
export const ContravariantInput = makeContravariant(XPureInputURI)({
  contramap: F.contramapState
})

/**
 * The `Contravariant` instance for `XPure[S1, S2, x, E, A]`
 */
export const ContravariantEnv = makeContravariant(XPureEnvURI)({
  contramap: F.contramapEnv
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
 * The `Environmental` instance for `XPure`.
 */
export const Environmental = makeEnvironmental(XPureURI)({
  access: F.access
})

/**
 * The `Monad` instance for `StateReaderError`.
 */
export const Monad = makeMonad(StateReaderErrorURI)({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})

/**
 * The `Applicative` instance for `StateReaderError`.
 */
export const Applicative = makeApplicative(StateReaderErrorURI)({
  ...Any,
  ...AssociativeBoth,
  ...Covariant
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
  contramapState,
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
