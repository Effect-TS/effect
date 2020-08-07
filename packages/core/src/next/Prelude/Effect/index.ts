import * as S from "../../Effect"
import { EffectURI } from "../../Effect"
import { intersect } from "../Utils"
import { makeAccess } from "../abstract/Access"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeEither } from "../abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeEnvironmental } from "../abstract/Environmental"
import { makeForeachable } from "../abstract/Foreachable"
import { makeMonad } from "../abstract/Monad"

/**
 * @category definitions
 */

export const EffectEnvURI = "EffectEnv"
export type EffectEnvURI = typeof EffectEnvURI

declare module "../abstract/HKT" {
  interface URItoKind6<X, In, St, Env, Err, Out> {
    [EffectURI]: S.Effect<X, Env, Err, Out>
  }
}

/**
 * The `Covariant` instance for `Effect`.
 */
export const Covariant = makeCovariant(EffectURI)({
  map: S.map
})

/**
 * The `Any` instance for `Effect`.
 */
export const Any = makeAny(EffectURI)({
  any: () => S.of
})

/**
 * The `AssociativeBoth` instance for `Effect`.
 */
export const AssociativeBoth = makeAssociativeBoth(EffectURI)({
  both: (fb) => (fa) => S.zip_(fa, fb)
})

/**
 * The `Applicative` instance for `Effect`.
 */
export const Applicative = makeApplicative(EffectURI)({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * The `AssociativeEither` instance for `Effect`.
 */
export const AssociativeEither = makeAssociativeEither(EffectURI)({
  either: S.orElseEither
})

/**
 * The `AssociativeFlatten` instance for `Effect`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(EffectURI)({
  flatten: S.flatten
})

/**
 * The `Foreachable` instance for `Effect`.
 */
export const Foreachable = makeForeachable(EffectURI)({
  foreach: S.foreach,
  ...Covariant
})

/**
 * The `Access` instance for `Effect`.
 */
export const Access = makeAccess(EffectURI)({
  access: S.access,
  provide: S.provideAll
})

/**
 * The `Environmental` instance for `Effect`.
 */
export const Environmental = makeEnvironmental(EffectURI)(
  intersect(Access, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Effect`.
 */
export const Monad = makeMonad(EffectURI)(intersect(Any, Covariant, AssociativeFlatten))

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
