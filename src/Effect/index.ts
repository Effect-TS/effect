import * as C from "@effect-ts/system/Cause"
import * as T from "@effect-ts/system/Effect"
import * as E from "@effect-ts/system/Either"
import * as O from "@effect-ts/system/Option"

import { pipe } from "../Function"
import * as P from "../Prelude"
import * as DSL from "../Prelude/DSL"

const EffectURI = T.EffectURI
type EffectURI = typeof EffectURI

export type V = P.V<"E", "+"> & P.V<"X", "+"> & P.V<"R", "-">

declare module "../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [EffectURI]: T.Effect<X, R, E, A>
  }
}

export const Any = P.instance<P.Any<[EffectURI], V>>({
  any: () => T.succeed({})
})

export class NoneError {
  readonly _tag = "NoneError"
}

export const None = P.instance<P.None<[EffectURI], V>>({
  never: () => T.die(new NoneError())
})

export const AssociativeEither = P.instance<P.AssociativeEither<[EffectURI], V>>({
  either: (fb) => (fa) =>
    T.foldCauseM_(
      fa,
      (c) =>
        pipe(
          c,
          C.find((x) =>
            x._tag === "Die" && x.value instanceof NoneError ? O.some(x.value) : O.none
          ),
          O.fold(
            () => T.orElseEither_(T.halt(c), fb),
            () => T.map_(fb, E.right)
          )
        ),
      (a) => T.succeed(E.left(a))
    )
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[EffectURI], V>>({
  flatten: T.flatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[EffectURI], V>>({
  both: T.zip
})

export const Covariant = P.instance<P.Covariant<[EffectURI], V>>({
  map: T.map
})

export const IdentityEither: P.IdentityEither<[EffectURI], V> = {
  ...AssociativeEither,
  ...None
}

export const IdentityFlatten: P.IdentityFlatten<[EffectURI], V> = {
  ...Any,
  ...AssociativeFlatten
}

export const IdentityBoth: P.IdentityBoth<[EffectURI], V> = {
  ...Any,
  ...AssociativeBoth
}

export const Monad: P.Monad<[EffectURI], V> = {
  ...IdentityFlatten,
  ...Covariant
}

export const Applicative: P.Applicative<[EffectURI], V> = {
  ...Covariant,
  ...IdentityBoth
}

export const Fail = P.instance<P.FX.Fail<[EffectURI], V>>({
  fail: T.fail
})

export const Run = P.instance<P.FX.Run<[EffectURI], V>>({
  run: T.either
})

export const getValidationApplicative = DSL.getValidationF<[EffectURI], V>({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

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
} from "@effect-ts/system/Effect"
