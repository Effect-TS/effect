import * as S from "../../Effect"
import { Any3 } from "../abstract/Any"
import { Applicative3 } from "../abstract/Applicative"
import { AssociativeBoth3 } from "../abstract/AssociativeBoth"
import { AssociativeEither3 } from "../abstract/AssociativeEither"
import { AssociativeFlatten3 } from "../abstract/AssociativeFlatten"
import { Contravariant3 } from "../abstract/Contravariant"
import { Covariant3 } from "../abstract/Covariant"
import { Foreachable3 } from "../abstract/Foreachable"
import { HasURI } from "../abstract/HKT"
import { Monad3 } from "../abstract/Monad"

export const EffectAsyncEnvURI = "EffectAsyncEnv"
export type EffectAsyncEnvURI = typeof EffectAsyncEnvURI

export const EffectAsyncURI = "EffectAsync"
export type EffectAsyncURI = typeof EffectAsyncURI

declare module "../abstract/HKT" {
  interface URItoKind3<R, E, A> {
    [EffectAsyncEnvURI]: S.AsyncRE<A, E, R>
    [EffectAsyncURI]: S.AsyncRE<R, E, A>
  }
}

export const HasEffectAsyncURI: HasURI<EffectAsyncURI> = {
  URI: EffectAsyncURI
}

export const HasEffectContravariantURI: HasURI<EffectAsyncEnvURI> = {
  URI: EffectAsyncEnvURI
}

export const ContravariantEnv: Contravariant3<EffectAsyncEnvURI> = {
  Contravariant: "Contravariant",
  contramap: S.provideSome,
  ...HasEffectContravariantURI
}

export const Covariant: Covariant3<EffectAsyncURI> = {
  Covariant: "Covariant",
  map: S.map,
  ...HasEffectAsyncURI
}

export const AssociativeBoth: AssociativeBoth3<EffectAsyncURI> = {
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => S.zip_(fa, fb),
  ...HasEffectAsyncURI
}

export const AssociativeBothPar: AssociativeBoth3<EffectAsyncURI> = {
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => S.zipPar_(fa, fb),
  ...HasEffectAsyncURI
}

export const Any: Any3<EffectAsyncURI> = {
  Any: "Any",
  any: () => S.of,
  ...HasEffectAsyncURI
}

export const Applicative: Applicative3<EffectAsyncURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const ApplicativePar: Applicative3<EffectAsyncURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBothPar
}

export const AssociativeEither: AssociativeEither3<EffectAsyncURI> = {
  AssociativeEither: "AssociativeEither",
  either: S.orElseEither,
  ...HasEffectAsyncURI
}

export const Foreachable: Foreachable3<EffectAsyncURI> = {
  Foreachable: "Foreachable",
  foreach: S.foreach,
  ...Covariant
}

export const ForeachablePar: Foreachable3<EffectAsyncURI> = {
  Foreachable: "Foreachable",
  foreach: S.foreachPar,
  ...Covariant
}

export function ForeachableParN(n: number): Foreachable3<EffectAsyncURI> {
  return {
    Foreachable: "Foreachable",
    foreach: S.foreachParN(n),
    ...Covariant
  }
}

export const AssociativeFlatten: AssociativeFlatten3<EffectAsyncURI> = {
  AssociativeFlatten: "AssociativeFlatten",
  flatten: S.flatten,
  ...HasEffectAsyncURI
}

export const Monad: Monad3<EffectAsyncURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
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
