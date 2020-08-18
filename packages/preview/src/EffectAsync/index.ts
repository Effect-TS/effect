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
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
import * as S from "../_system/Effect"

export const EffectAsyncURI = "EffectAsync"
export type EffectAsyncURI = typeof EffectAsyncURI

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
    [EffectAsyncURI]: S.AsyncRE<Env, Err, Out>
  }
}

/**
 * The `Covariant` instance for `EffectAsync`.
 */
export const Covariant = instance<CovariantK<EffectAsyncURI>>({
  map: S.map
})

/**
 * The `AssociativeBoth` instance for `EffectAsync`.
 */
export const AssociativeBoth = instance<AssociativeBothK<EffectAsyncURI>>({
  both: S.zip
})

/**
 * The Parallel `AssociativeBoth` instance for `EffectAsync`.
 */
export const AssociativeBothPar = instance<AssociativeBothK<EffectAsyncURI>>({
  both: S.zipPar
})

/**
 * The `Any` instance for `EffectAsync`.
 */
export const Any = instance<AnyK<EffectAsyncURI>>({
  any: () => S.of
})

/**
 * The `Applicative` instance for `EffectAsync`.
 */
export const Applicative = instance<ApplicativeK<EffectAsyncURI>>(
  intersect(Any, Covariant, AssociativeBoth)
)

/**
 * The Parallel `Applicative` instance for `EffectAsync`.
 */
export const ApplicativePar = instance<ApplicativeK<EffectAsyncURI>>(
  intersect(Any, Covariant, AssociativeBothPar)
)

/**
 * The `AssociativeEither` instance for `EffectAsync`.
 */
export const AssociativeEither = instance<AssociativeEitherK<EffectAsyncURI>>({
  either: S.orElseEither
})

/**
 * The `AssociativeFlatten` instance for `EffectAsync`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<EffectAsyncURI>>({
  flatten: S.flatten
})

/**
 * The `Access` instance for `EffectAsync`.
 */
export const Access = instance<AccessK<EffectAsyncURI>>({
  access: S.access,
  provide: S.provideAll
})

/**
 * The `IdentityFlatten` instance for `EffectAsync`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<EffectAsyncURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `EffectAsync`.
 */
export const Monad = instance<MonadK<EffectAsyncURI>>(
  intersect(Covariant, IdentityFlatten)
)

/**
 * The `Environmental` instance for `EffectAsync`.
 */
export const Environmental = instance<EnvironmentalK<EffectAsyncURI>>(
  intersect(Access, Monad)
)

/**
 * The `Fail` instance for `EffectAsync`.
 */
export const Fail = instance<FailK<EffectAsyncURI>>({
  fail: S.fail
})

/**
 * The `Recover` instance for `EffectAsync`.
 */
export const Recover = instance<RecoverK<EffectAsyncURI>>({
  recover: S.catchAll
})

/**
 * The `Run` instance for `EffectAsync`.
 */
export const Run = instance<RunK<EffectAsyncURI>>({
  run: S.either
})

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
  zip_
} from "../_system/Effect"
