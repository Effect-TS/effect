import * as S from "../../Effect"
import { EffectURI } from "../../Effect"
import { Any4 } from "../abstract/Any"
import { Applicative4 } from "../abstract/Applicative"
import { AssociativeBoth4 } from "../abstract/AssociativeBoth"
import { AssociativeEither4 } from "../abstract/AssociativeEither"
import { AssociativeFlatten4 } from "../abstract/AssociativeFlatten"
import { Contravariant4 } from "../abstract/Contravariant"
import { Covariant4 } from "../abstract/Covariant"
import { Foreachable4 } from "../abstract/Foreachable"
import { HasURI } from "../abstract/HKT"
import { Monad4 } from "../abstract/Monad"

/**
 * @category definitions
 */

export const EffectEnvURI = "EffectEnv"
export type EffectEnvURI = typeof EffectEnvURI

export type EffectEnv<S, R, E, A> = S.Effect<S, A, E, R>

declare module "../abstract/HKT" {
  interface URItoKind4<S, R, E, A> {
    [EffectEnvURI]: EffectEnv<S, R, E, A>
    [EffectURI]: S.Effect<S, R, E, A>
  }
}

export const HasEffectEnvURI: HasURI<EffectEnvURI> = {
  URI: EffectEnvURI
}

export const HasEffectURI: HasURI<EffectURI> = {
  URI: EffectURI
}

/**
 * The `Contravariant` instance for `EffectEnv`.
 */
export const ContravariantEnv: Contravariant4<EffectEnvURI> = {
  Contravariant: "Contravariant",
  contramap: S.provideSome,
  ...HasEffectEnvURI
}

/**
 * The `Covariant` instance for `Effect`.
 */
export const Covariant: Covariant4<EffectURI> = {
  Covariant: "Covariant",
  map: S.map,
  ...HasEffectURI
}

/**
 * The `Any` instance for `Effect`.
 */
export const Any: Any4<EffectURI> = {
  Any: "Any",
  any: () => S.of,
  ...HasEffectURI
}

/**
 * The `AssociativeBoth` instance for `Effect`.
 */
export const AssociativeBoth: AssociativeBoth4<EffectURI> = {
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => S.zip_(fa, fb),
  ...HasEffectURI
}

/**
 * The `Applicative` instance for `Effect`.
 */
export const Applicative: Applicative4<EffectURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

/**
 * The `AssociativeEither` instance for `Effect`.
 */
export const AssociativeEither: AssociativeEither4<EffectURI> = {
  AssociativeEither: "AssociativeEither",
  either: S.orElseEither,
  ...HasEffectURI
}

/**
 * The `AssociativeFlatten` instance for `Effect`.
 */
export const AssociativeFlatten: AssociativeFlatten4<EffectURI> = {
  AssociativeFlatten: "AssociativeFlatten",
  flatten: S.flatten,
  ...HasEffectURI
}

/**
 * The `Foreachable` instance for `Effect`.
 */
export const Foreachable: Foreachable4<EffectURI> = {
  Foreachable: "Foreachable",
  foreach: S.foreach,
  ...HasEffectURI,
  ...Covariant
}

/**
 * The `Monad` instance for `Effect`.
 */
export const Monad: Monad4<EffectURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

/**
 * @category api
 */

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
  Async,
  AsyncCancel,
  AsyncE,
  AsyncR,
  AsyncRE,
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
  runSync,
  runSyncExit,
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
  Sync,
  SyncE,
  SyncR,
  SyncRE,
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
  zip_
} from "../../Effect"
