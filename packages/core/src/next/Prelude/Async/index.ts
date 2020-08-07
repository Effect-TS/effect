import * as S from "../../Effect"
import { Any3 } from "../abstract/Any"
import { Applicative3 } from "../abstract/Applicative"
import { AssociativeBoth3 } from "../abstract/AssociativeBoth"
import { AssociativeEither3 } from "../abstract/AssociativeEither"
import { Contravariant3 } from "../abstract/Contravariant"
import { Covariant3 } from "../abstract/Covariant"
import { Foreachable3 } from "../abstract/Foreachable"
import { HasURI } from "../abstract/HKT"
import { Monad3 } from "../abstract/Monad"

export const AsyncEnvURI = "AsyncEnv"
export type AsyncEnvURI = typeof AsyncEnvURI

export const AsyncURI = "Async"
export type AsyncURI = typeof AsyncURI

declare module "../abstract/HKT" {
  interface URItoKind3<R, E, A> {
    [AsyncEnvURI]: S.AsyncRE<A, E, R>
    [AsyncURI]: S.AsyncRE<R, E, A>
  }
}

export const HasAsyncURI: HasURI<AsyncURI> = {
  URI: AsyncURI
}

export const HasContravariantURI: HasURI<AsyncEnvURI> = {
  URI: AsyncEnvURI
}

export const ContravariantEnv: Contravariant3<AsyncEnvURI> = {
  ...HasContravariantURI,
  contramap: S.provideSome
}

export const Covariant: Covariant3<AsyncURI> = {
  ...HasAsyncURI,
  map: S.map
}

export const AssociativeBoth: AssociativeBoth3<AsyncURI> = {
  ...HasAsyncURI,
  both: (fb) => (fa) => S.zip_(fa, fb)
}

export const AssociativeBothPar: AssociativeBoth3<AsyncURI> = {
  ...HasAsyncURI,
  both: (fb) => (fa) => S.zipPar_(fa, fb)
}

export const Any: Any3<AsyncURI> = {
  ...HasAsyncURI,
  any: () => S.of
}

export const Applicative: Applicative3<AsyncURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const ApplicativePar: Applicative3<AsyncURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBothPar
}

export const AssociativeEither: AssociativeEither3<AsyncURI> = {
  ...HasAsyncURI,
  either: S.orElseEither
}

export const Foreachable: Foreachable3<AsyncURI> = {
  ...Covariant,
  foreach: S.foreach
}

export const ForeachablePar: Foreachable3<AsyncURI> = {
  ...Covariant,
  foreach: S.foreachPar
}

export function ForeachableParN(n: number): Foreachable3<AsyncURI> {
  return {
    ...Covariant,
    foreach: S.foreachParN(n)
  }
}

export const Monad: Monad3<AsyncURI> = {
  ...Any,
  ...Covariant,
  flatten: S.flatten
}

/**
 * @category api
 */

export function cast<S, A>(effect: S.Effect<S, unknown, never, A>): S.Async<A> {
  return effect
}

export function castR<S, R, A>(effect: S.Effect<S, R, never, A>): S.AsyncR<R, A> {
  return effect
}

export function castE<S, E, A>(effect: S.Effect<S, unknown, E, A>): S.AsyncE<E, A> {
  return effect
}

export function castRE<S, R, E, A>(effect: S.Effect<S, R, E, A>): S.AsyncRE<R, E, A> {
  return effect
}

export {
  absolve,
  access,
  accessM,
  accessRegion,
  accessRegionM,
  accessService,
  accessServiceF,
  accessServiceIn,
  accessServiceInM,
  accessServiceM,
  accessServices,
  accessServicesM,
  accessServicesT,
  accessServicesTM,
  ap,
  ap_,
  as,
  asSomeError,
  asUnit,
  as_,
  bimap,
  bind,
  bindAll,
  bindAllPar,
  bindAllParN,
  bracket,
  bracketExit,
  bracketExit_,
  bracketFiber,
  bracketFiber_,
  bracket_,
  Canceler,
  CancelMain,
  catchAll,
  catchAllCause,
  catchAllCause_,
  catchAll_,
  cause,
  causeAsError,
  Cb,
  chain,
  chain_,
  checkDescriptor,
  checkInterrupt,
  collectAll,
  collectAllPar,
  collectAllParN,
  collectAllUnit,
  collectAllUnitPar,
  collectAllUnitParN,
  DefaultEnv,
  defaultEnv,
  delay,
  delay_,
  die,
  disconnect,
  done,
  Effect,
  effectAsync,
  effectAsyncInterrupt,
  effectAsyncOption,
  effectMaybeAsyncInterrupt,
  effectPartial,
  effectTotal,
  EffectURI,
  either,
  ensuring,
  environment,
  errorFromCause,
  ExecutionStrategy,
  fail,
  fiberContext,
  fiberId,
  first,
  flatten,
  fold,
  foldCause,
  foldCauseM,
  foldCauseM_,
  foldCause_,
  foldM,
  foldM_,
  fold_,
  foreach,
  foreachExec,
  foreachExec_,
  foreachPar,
  foreachParN,
  foreachParN_,
  foreachPar_,
  foreachUnit,
  foreachUnitPar,
  foreachUnitParN,
  foreachUnitParN_,
  foreachUnitPar_,
  foreachUnit_,
  foreach_,
  forever,
  fork,
  forkDaemon,
  forkIn,
  forkScopeWith,
  fromEither,
  halt,
  ifM,
  interrupt,
  interruptAs,
  interruptible,
  interruptStatus,
  InterruptStatusRestore,
  interruptStatus_,
  let,
  map,
  mapError,
  mapErrorCause,
  mapErrorCause_,
  mapError_,
  map_,
  merge,
  never,
  of,
  onError,
  onExit,
  onExit_,
  onInterrupt,
  onInterruptExtended_,
  onInterrupt_,
  optional,
  orDie,
  orDieKeep,
  orDieWith,
  orDieWith_,
  orElseEither,
  orElseEither_,
  orElse_,
  Parallel,
  parallel,
  ParallelN,
  parallelN,
  provide,
  provideAll,
  provideAll_,
  provideService,
  provideServiceM,
  provideSome,
  provideSomeLayer,
  provideSomeLayer_,
  provideSome_,
  provide_,
  race,
  raceEither,
  raceEither_,
  raceFirst,
  raceWith,
  race_,
  readRegion,
  readService,
  readServiceIn,
  Region,
  region,
  RegionURI,
  repeat,
  repeatOrElseEither_,
  repeatOrElse_,
  repeat_,
  replaceService,
  replaceServiceM,
  replaceServiceM_,
  replaceService_,
  result,
  retry,
  retryOrElseEither_,
  retryOrElse_,
  retry_,
  runAsync,
  runAsyncAsap,
  runAsyncCancel,
  runMain,
  runPromise,
  runPromiseExit,
  Runtime,
  runtime,
  sequenceS,
  sequenceSPar,
  sequenceSParN,
  sequenceT,
  sequenceTPar,
  sequenceTParN,
  Sequential,
  sequential,
  sleep,
  succeed,
  summarized,
  summarized_,
  suspend,
  suspendPartial,
  tap,
  tapBoth,
  tapBoth_,
  tapCause,
  tapCause_,
  tapError,
  tapError_,
  tap_,
  timed,
  timedWith,
  timedWith_,
  toManaged,
  toPromise,
  transplant,
  tryOrElse_,
  uncause,
  uninterruptible,
  uninterruptibleMask,
  unit,
  useRegion,
  validate,
  validateExec,
  validateExec_,
  validatePar,
  validateParN,
  validateParN_,
  validatePar_,
  validate_,
  whenM,
  whenM_,
  withRuntime,
  withRuntimeM,
  yieldNow,
  zip,
  zipFirst,
  zipFirst_,
  zipPar,
  zipPar_,
  zipSecond,
  zipSecond_,
  zipWith,
  zipWithPar,
  zipWithPar_,
  zipWith_,
  zip_,
  Async,
  AsyncE,
  AsyncR,
  AsyncRE,
  AsyncCancel
} from "../../Effect"
