import {
  either as Ei,
  function as F,
  option as Op,
  task as TA,
  taskEither as TE,
} from "fp-ts";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import * as T from "./effect";
import * as ex from "./original/exit";
import { Runtime } from "./original/runtime";
import { Monad4E, MonadThrow4E, Alt4E } from "./overloadEff";
import { Bifunctor4 } from "fp-ts/lib/Bifunctor";
import { Functor4 } from "fp-ts/lib/Functor";
import { DriverSyncImpl } from "./driverSync";
import { identity } from "fp-ts/lib/function";

// WIP
/* istanbul ignore file */

export interface Eff<S, R, E, A> {
  _tag: T.EffectTag;

  _TAG: () => "Eff";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;

  fluent: <K extends R>() => EffIO<S, K, E, A>;
  effect: <K extends R>() => T.Effect<K, E, A>;
}

export interface AsyncEff<R, E, A> extends Eff<ASYNC, R, E, A> {}
export interface SyncEff<R, E, A> extends Eff<SYNC, R, E, A> {}

export const URI = "matechs/Eff";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: Eff<S, R, E, A>;
  }
}

export type ASYNC = unknown;
export type SYNC = never;

export const zipWith: <S1, S2, R, E, A, R2, E2, B, C>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
) => Eff<S1 | S2, R & R2, E | E2, C> = T.zipWith as any;

export const zip: <S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
) => Eff<S1 | S2, R & R2, E | E2, readonly [A, B]> = T.zip as any;

export const pure: <A>(a: A) => SyncEff<T.NoEnv, T.NoErr, A> = T.pure as any;

export const of: <S, R, E, A>(a: A) => Eff<S, R, E, A> = T.pure as any;

export const applyFirst: <S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
) => Eff<S1 | S2, R & R2, E | E2, A> = T.applyFirst as any;

export const applySecond: <S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
) => Eff<S1 | S2, R & R2, E | E2, B> = T.applySecond as any;

export const applySecondL: <S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: F.Lazy<Eff<S2, R2, E2, B>>
) => Eff<S1 | S2, R & R2, E | E2, B> = T.applySecondL as any;

export const ap__: <S1, S2, R, E, A, R2, E2, B>(
  ioa: Eff<S1, R, E, A>,
  iof: Eff<S2, R2, E2, F.FunctionN<[A], B>>
) => Eff<S1 | S2, R & R2, E | E2, B> = T.ap__ as any;

export const flip: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, A, E> = T.flip as any;

export const forever: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, E, never> = T.forever as any;

export const raised: <E, A = never>(
  e: ex.Cause<E>
) => SyncEff<T.NoEnv, E, A> = T.raised as any;

export const raiseError: <E, A = never>(
  e: E
) => SyncEff<T.NoEnv, E, A> = T.raiseError as any;

export const raiseAbort: (
  u: unknown
) => SyncEff<T.NoEnv, T.NoErr, never> = T.raiseAbort as any;

export const raiseInterrupt: SyncEff<
  T.NoEnv,
  T.NoErr,
  never
> = T.raiseInterrupt as any;

export const completed: <E, A>(
  exit: ex.Exit<E, A>
) => SyncEff<T.NoEnv, E, A> = T.completed as any;

export const suspended: <S, R, E, A>(
  thunk: F.Lazy<Eff<S, R, E, A>>
) => Eff<S, R, E, A> = T.suspended as any;

export const sync: <E = T.NoErr, A = unknown>(
  thunk: F.Lazy<A>
) => SyncEff<T.NoEnv, E, A> = T.sync as any;

export const trySync: <E = unknown, A = unknown>(
  thunk: F.Lazy<A>
) => SyncEff<T.NoEnv, E, A> = T.trySync as any;

export const trySyncMap: <E = unknown>(
  onError: (e: unknown) => E
) => <A = unknown>(
  thunk: F.Lazy<A>
) => SyncEff<T.NoEnv, E, A> = T.trySyncMap as any;

export const async: <E, A>(
  op: T.AsyncFn<E, A>
) => Eff<ASYNC, T.NoEnv, E, A> = T.async as any;

export const asyncTotal: <A>(
  op: F.FunctionN<[F.FunctionN<[A], void>], T.AsyncCancelContFn>
) => AsyncEff<T.NoEnv, T.NoErr, A> = T.asyncTotal as any;

export const interruptibleRegion: <S, R, E, A>(
  inner: Eff<S, R, E, A>,
  flag: boolean
) => Eff<S, R, E, A> = T.interruptibleRegion as any;

export const encaseOption: <E, A>(
  o: Op.Option<A>,
  onError: F.Lazy<E>
) => SyncEff<T.NoEnv, E, A> = T.encaseOption as any;

export const chainOption: <E>(
  onEmpty: F.Lazy<E>
) => <A, B>(
  bind: F.FunctionN<[A], Op.Option<B>>
) => <S, R, E2>(
  eff: Eff<S, R, E2, A>
) => Eff<S, R, E | E2, B> = T.chainOption as any;

export const encaseEither: <E, A>(
  e: Ei.Either<E, A>
) => SyncEff<T.NoEnv, E, A> = T.encaseEither as any;

export const chainEither: <A, E, B>(
  bind: F.FunctionN<[A], Ei.Either<E, B>>
) => <S, R, E2>(
  eff: Eff<S, R, E2, A>
) => Eff<S, R, E | E2, B> = T.chainEither as any;

export const chainError: <S1, R, E1, E2, A>(
  f: F.FunctionN<[E1], Eff<S1, R, E2, A>>
) => <S2, R2>(
  rio: Eff<S2, R2, E1, A>
) => Eff<S1 | S2, R & R2, E2, A> = T.chainError as any;

export const mapError: <E1, E2>(
  f: F.FunctionN<[E1], E2>
) => <S, R, A>(io: Eff<S, R, E1, A>) => Eff<S, R, E2, A> = T.mapError as any;

export const orAbort: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, T.NoErr, A> = T.orAbort as any;

export const uninterruptible: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, E, A> = T.uninterruptible as any;

export const interruptible: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, E, A> = T.interruptible as any;

export const after: (
  ms: number
) => AsyncEff<T.NoEnv, T.NoErr, void> = T.after as any;

export const fromPromise: <A>(
  thunk: F.Lazy<Promise<A>>
) => AsyncEff<T.NoEnv, unknown, A> = T.fromPromise as any;

export const encaseTask: <A>(
  task: TA.Task<A>
) => AsyncEff<T.NoEnv, T.NoErr, A> = T.encaseTask as any;

export const chainTask: <A, B>(
  bind: F.FunctionN<[A], TA.Task<B>>
) => <S, R, E2>(
  eff: Eff<S, R, E2, A>
) => Eff<S | ASYNC, R, E2, B> = T.chainTask as any;

export const encaseTaskEither: <E, A>(
  taskEither: TE.TaskEither<E, A>
) => AsyncEff<T.NoEnv, E, A> = T.encaseTaskEither as any;

export const chainTaskEither: <A, E, B>(
  bind: F.FunctionN<[A], TE.TaskEither<E, B>>
) => <S, R, E2>(
  eff: Eff<S, R, E2, A>
) => AsyncEff<R, E | E2, B> = T.chainTaskEither as any;

export const accessInterruptible: Eff<
  SYNC,
  T.NoEnv,
  T.NoErr,
  boolean
> = new T.EffectIO(T.EffectTag.AccessInterruptible, F.identity) as any;

export const accessRuntime: Eff<
  SYNC,
  T.NoEnv,
  T.NoErr,
  Runtime
> = new T.EffectIO(T.EffectTag.AccessRuntime, F.identity) as any;

export const withRuntime: <S, E, A>(
  f: F.FunctionN<[Runtime], Eff<S, T.NoEnv, E, A>>
) => Eff<S, T.NoEnv, E, A> = T.withRuntime as any;

export const accessEnvironment: <R>() => SyncEff<
  R,
  T.NoErr,
  R
> = T.accessEnvironment as any;

export const accessM: <S, R, R2, E, A>(
  f: F.FunctionN<[R], Eff<S, R2, E, A>>
) => Eff<S, R & R2, E, A> = T.accessM as any;

export const access: <R, A, E = T.NoErr>(
  f: F.FunctionN<[R], A>
) => SyncEff<R, E, A> = T.access as any;

export const mergeEnv: <A>(a: A) => <B>(b: B) => A & B = T.mergeEnv;

export const provideAll: <R>(
  r: R
) => <S, E, A>(
  ma: Eff<S, R, E, A>
) => Eff<S, unknown, E, A> = T.provideAll as any;

export const provide: <R>(
  r: R
) => <S, R2, E, A>(
  ma: Eff<S, R2 & R, E, A>
) => Eff<S, R2, E, A> = T.provide as any;

export const provideR: <R2, R>(
  f: (r2: R2) => R
) => <S, E, A>(ma: Eff<S, R, E, A>) => Eff<S, R2, E, A> = T.provideR as any;

export interface Provider<Environment, Module, S2, E2> {
  <S1, R, E, A>(e: Eff<S1, Module & R, E, A>): Eff<
    S1 | S2,
    Environment & R,
    E | E2,
    A
  >;
}

export const provideS: <R>(
  r: R
) => Provider<unknown, R, SYNC, never> = T.provideS as any;

export const provideSO: <R>(
  r: R
) => Provider<unknown, R, SYNC, never> = T.provideSO as any;

export const provideSW: <M>() => <S1, R, E, A>(
  res: Eff<S1, R, E, A>
) => (f: (a: A) => M) => Provider<R, M, S1, E> = T.provideSW as any;

export const provideSM: <S1, R, R3, E2>(
  rm: Eff<S1, R3, E2, R>
) => Provider<R3, R, S1, E2> = T.provideSM as any;

export const provideM: <S1, R2, R, E2>(
  f: Eff<S1, R2, E2, R>
) => Provider<R2, R, S1, E2> = T.provideM as any;

export const provideSomeM: <S1, R2, R, E2>(
  f: Eff<S1, R2, E2, R>
) => Provider<R2, R, S1, E2> = T.provideSomeM as any;

export const lift: <A, B>(
  f: F.FunctionN<[A], B>
) => <S, R, E>(io: Eff<S, R, E, A>) => Eff<S, R, E, B> = T.lift as any;

export interface EffMonad
  extends Monad4E<URI>,
    Bifunctor4<URI>,
    MonadThrow4E<URI>,
    Alt4E<URI>,
    Functor4<URI> {
  chainError<S1, S2, R, E1, R2, E2, A, A2>(
    io: Eff<S1, R, E1, A>,
    f: F.FunctionN<[E1], Eff<S2, R2, E2, A2>>
  ): Eff<S1 | S2, R & R2, E2, A | A2>;

  foldExit<S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
    inner: Eff<S1, R, E1, A1>,
    failure: F.FunctionN<[ex.Cause<E1>], Eff<S2, R2, E2, A2>>,
    success: F.FunctionN<[A1], Eff<S3, R3, E3, A3>>
  ): Eff<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3>;

  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: Eff<S1, R, E, A>,
    bind: F.FunctionN<[A], Eff<S1, R2, E2, unknown>>
  ): Eff<S1 | S2, R & R2, E | E2, A>;

  mapError: EffMonad["mapLeft"];

  onInterrupted<S1, S2, R, E, A, R2, E2>(
    ioa: Eff<S1, R, E, A>,
    finalizer: Eff<S2, R2, E2, unknown>
  ): Eff<S1 | S2, R & R2, E | E2, A>;

  onComplete<S1, S2, R, E, A, R2, E2>(
    ioa: Eff<S1, R, E, A>,
    finalizer: Eff<S2, R2, E2, unknown>
  ): Eff<S1 | S2, R & R2, E | E2, A>;
}

export const chainTap: <S1, R, E, A>(
  bind: F.FunctionN<[A], Eff<S1, R, E, unknown>>
) => <S2, R2, E2>(
  inner: Eff<S2, R2, E2, A>
) => Eff<S1 | S2, R & R2, E | E2, A> = T.chainTap as any;

export const as: <S, R, E, A, B>(
  io: Eff<S, R, E, A>,
  b: B
) => Eff<S, R, E, B> = T.as as any;

export const asUnit: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, E, void> = T.asUnit as any;

export const unit: SyncEff<T.NoEnv, T.NoErr, void> = T.unit as any;

export const to: <B>(
  b: B
) => <S, R, E, A>(io: Eff<S, R, E, A>) => Eff<S, R, E, B> = T.to as any;

export type InterruptMaskCutout<S, R, E, A> = F.FunctionN<
  [Eff<S, R, E, A>],
  Eff<S, R, E, A>
>;

export const uninterruptibleMask: <S, R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<S, R, E, A>], Eff<S, R, E, A>>
) => Eff<S, R, E, A> = T.uninterruptibleMask as any;

export const result: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => Eff<S, R, T.NoErr, ex.Exit<E, A>> = T.result as any;

export const bracketExit: <S1, S2, S3, R, E, A, B, R2, E2, R3, E3>(
  acquire: Eff<S1, R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], Eff<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Eff<S3, R3, E3, B>>
) => Eff<S1 | S2 | S3, R & R2 & R3, E | E2 | E3, B> = T.bracketExit as any;

export const bracket: <S1, S2, S3, R, E, A, R2, E2, R3, E3, B>(
  acquire: Eff<S1, R, E, A>,
  release: F.FunctionN<[A], Eff<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Eff<S3, R3, E3, B>>
) => Eff<S1 | S2 | S3, R & R2 & R3, E | E2 | E3, B> = T.bracket as any;

export const onComplete: <S2, R2, E2>(
  finalizer: Eff<S2, R2, E2, unknown>
) => <S1, R, E, A>(
  ioa: Eff<S1, R, E, A>
) => Eff<S1 | S2, R & R2, E | E2, A> = T.onComplete as any;

export const onInterrupted: <S2, R2, E2>(
  finalizer: Eff<S2, R2, E2, unknown>
) => <S1, R, E, A>(
  ioa: Eff<S1, R, E, A>
) => Eff<S2 | S1, R & R2, E2 | E, A> = T.onInterrupted as any;

export const combineInterruptExit: <S1, S2, R, E, A, R2, E2>(
  ioa: Eff<S1, R, E, A>,
  finalizer: Eff<S2, R2, E2, ex.Interrupt[]>
) => Eff<S1 | S2, R & R2, E | E2, A> = T.combineInterruptExit as any;

export const shifted: AsyncEff<T.NoEnv, T.NoErr, void> = T.shifted as any;

export const shiftBefore: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => AsyncEff<R, E, A> = T.shiftBefore as any;

export const shiftAfter: <S, R, E, A>(
  io: Eff<S, R, E, A>
) => AsyncEff<R, E, A> = T.shiftAfter as any;

export const never: AsyncEff<T.NoEnv, T.NoErr, never> = T.never as any;

export const delay: <S, R, E, A>(
  inner: Eff<S, R, E, A>,
  ms: number
) => AsyncEff<R, E, A> = T.delay as any;

export const liftDelay: (
  ms: number
) => <S, R, E, A>(
  io: Eff<S, R, E, A>
) => AsyncEff<R, E, A> = T.liftDelay as any;

export interface Fiber<S, E, A> {
  readonly name: Op.Option<string>;
  readonly interrupt: Eff<S, T.NoEnv, T.NoErr, ex.Interrupt>;
  readonly wait: AsyncEff<T.NoEnv, T.NoErr, ex.Exit<E, A>>;
  readonly join: AsyncEff<T.NoEnv, E, A>;
  readonly result: AsyncEff<T.NoEnv, E, Op.Option<A>>;
  readonly isComplete: Eff<S, T.NoEnv, T.NoErr, boolean>;
}

export const makeFiber: <S, R, E, A>(
  init: Eff<S, R, E, A>,
  name?: string
) => SyncEff<R, T.NoErr, Fiber<S, E, A>> = T.makeFiber as any;

export const fork: <S, R, E, A>(
  io: Eff<S, R, E, A>,
  name?: string
) => SyncEff<R, T.NoErr, Fiber<S, E, A>> = T.fork as any;

export const raceFold: <S1, S2, S3, S4, R, R2, R3, R4, E1, E2, E3, A, B, C>(
  first: Eff<S1, R, E1, A>,
  second: Eff<S2, R2, E2, B>,
  onFirstWon: F.FunctionN<
    [ex.Exit<E1, A>, Fiber<S2, E2, B>],
    Eff<S3, R3, E3, C>
  >,
  onSecondWon: F.FunctionN<
    [ex.Exit<E2, B>, Fiber<S1, E1, A>],
    Eff<S4, R4, E3, C>
  >
) => Eff<S1 | S2 | S3 | S4, R & R2 & R3 & R4, E3, C> = T.raceFold as any;

export const timeoutFold: <S1, S2, S3, R, E1, E2, A, B>(
  source: Eff<S1, R, E1, A>,
  ms: number,
  onTimeout: F.FunctionN<[Fiber<S1, E1, A>], Eff<S2, T.NoEnv, E2, B>>,
  onCompleted: F.FunctionN<[ex.Exit<E1, A>], Eff<S3, T.NoEnv, E2, B>>
) => AsyncEff<R, E2, B> = T.timeoutFold as any;

export const raceFirst: <S1, S2, R, R2, E, A>(
  io1: Eff<S1, R, E, A>,
  io2: Eff<S2, R2, E, A>
) => Eff<S1 | S2, R & R2, E, A> = T.raceFirst as any;

export const race: <S1, S2, R, R2, E, A>(
  io1: Eff<S1, R, E, A>,
  io2: Eff<S2, R2, E, A>
) => AsyncEff<R & R2, E, A> = T.race as any;

export const parZipWith: <S1, S2, R, R2, E, E2, A, B, C>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
) => AsyncEff<R & R2, E | E2, C> = T.parZipWith as any;

export const parZip: <S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
) => AsyncEff<R & R2, E, readonly [A, B]> = T.parZip as any;

export const parApplyFirst: <S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
) => AsyncEff<R & R2, E, A> = T.parApplyFirst as any;

export const parApplySecond: <S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
) => AsyncEff<R & R2, E, B> = T.parApplySecond as any;

export const parAp: <S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iof: Eff<S2, R2, E, F.FunctionN<[A], B>>
) => AsyncEff<R & R2, E, B> = T.parAp as any;

export const parAp_: <S1, S2, R, R2, E, E2, A, B>(
  iof: Eff<S1, R, E, F.FunctionN<[A], B>>,
  ioa: Eff<S2, R2, E2, A>
) => AsyncEff<R & R2, E | E2, B> = T.parAp_ as any;

export const timeoutOption: <S, R, E, A>(
  source: Eff<S, R, E, A>,
  ms: number
) => AsyncEff<R, E, Op.Option<A>> = T.timeoutOption as any;

export const run: <S, E, A>(
  io: Eff<S, {}, E, A>,
  callback?: F.FunctionN<[ex.Exit<E, A>], void>
) => F.Lazy<void> = T.run as any;

export function runSync<E, A>(io: SyncEff<{}, E, A>): ex.Exit<E, A> {
  const res = new DriverSyncImpl<E, A>().start(io as any);

  if (res._tag === "Left") {
    throw res.left;
  } else {
    return res.right;
  }
}

export function runUnsafeSync<E, A>(io: SyncEff<{}, E, A>): A {
  const result = runSync(io);

  if (result._tag !== "Done") {
    throw result._tag === "Raise"
      ? result.error
      : result._tag === "Abort"
      ? result.abortedWith
      : result;
  }
  return result.value;
}

export const runToPromise: <S, E, A>(
  io: Eff<S, {}, E, A>
) => Promise<A> = T.runToPromise as any;

export const runToPromiseExit: <S, E, A>(
  io: Eff<S, {}, E, A>
) => Promise<ex.Exit<E, A>> = T.runToPromiseExit as any;

export const eff: EffMonad = {
  ...(T.effect as any),
  URI,
};

export const parEff: Monad4E<URI> & Bifunctor4<URI> & MonadThrow4E<URI> = {
  ...(T.parEffect as any),
  URI,
};

export const {
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  flatten,
  map,
  alt,
  bimap,
  filterOrElse,
  fromEither,
  fromOption,
  fromPredicate,
  mapLeft,
} = pipeable(eff);

export const liftEither: <A, E, B>(
  f: F.FunctionN<[A], Ei.Either<E, B>>
) => F.FunctionN<[A], SyncEff<T.NoEnv, E, B>> = T.liftEither as any;

export const retype = <S, R, E, A>(
  _: Eff<S, R, E, A>
): unknown extends S ? AsyncEff<R, E, A> : SyncEff<R, E, A> => _ as any;

export const encaseSyncOrAbort = <R, E, A>(
  _: T.Effect<R, E, A>
): SyncEff<R, E, A> =>
  pipe(
    access((r: R) => T.runSync(T.provideAll(r)(_))),
    chainEither(identity),
    orAbort,
    chain(completed)
  );

export const encaseSyncMap = <R, E, A, E2>(
  _: T.Effect<R, E, A>,
  onAsync: (_: Error) => E2
): SyncEff<R, E | E2, A> =>
  pipe(
    access((r: R) => T.runSync(T.provideAll(r)(_))),
    chain((x) =>
      x._tag === "Left"
        ? raiseError<E | E2, A>(onAsync(x.left))
        : completed(x.right)
    )
  );

export const encaseEffect = <R, E, A>(
  _: T.Effect<R, E, A>
): AsyncEff<R, E, A> => _ as any;

export interface EffIO<S, R, E, A> extends Eff<S, R, E, A> {
  fluent<K extends R>(): EffIO<S, K, E, A>;

  chain<S1, R2, E2, A2>(
    f: (s: A) => Eff<S1, R2, E2, A2>
  ): EffIO<S | S1, R & R2, E | E2, A2>;

  chainEither<E2, A2>(f: (s: A) => Ei.Either<E2, A2>): EffIO<S, R, E | E2, A2>;

  chainTaskEither<E2, A2>(
    f: (s: A) => TE.TaskEither<E2, A2>
  ): EffIO<ASYNC, R, E | E2, A2>;

  chainTask<A2>(f: (s: A) => TA.Task<A2>): EffIO<ASYNC, R, E, A2>;

  chainOption<E2>(
    onEmpty: F.Lazy<E2>
  ): <A2>(f: (s: A) => Op.Option<A2>) => EffIO<S, R, E | E2, A2>;

  chainW<S1, R3, E3, A3>(
    w: Eff<S1, R3, E3, A3>
  ): <S2, R2, E2, A2>(
    f: (wa: A3, s: A) => Eff<S2, R2, E2, A2>
  ) => EffIO<S | S1 | S2, R & R2 & R3, E | E2 | E3, A2>;

  chainEnv<S1, R2, E2, A2>(
    f: (s: A, r: R) => Eff<S1, R2, E2, A2>
  ): EffIO<S | S1, R & R2, E | E2, A2>;

  chainAccess<S1, R3, R2, E2, A2>(
    f: (s: A, r: R3) => Eff<S1, R2, E2, A2>
  ): EffIO<S | S1, R & R3 & R2, E | E2, A2>;

  chainError<S1, R2, E2, A2>(
    f: (r: E) => EffIO<S1, R2, E2, A2>
  ): EffIO<S | S1, R & R2, E2, A | A2>;

  tap<S1, R2, E2, A2>(
    f: (s: A) => Eff<S1, R2, E2, A2>
  ): EffIO<S | S1, R & R2, E | E2, A>;

  provideS<R2 extends Partial<R>>(r: R2): EffIO<S, T.Strip<R, R2>, E, A>;

  provide(r: R): EffIO<S, unknown, E, A>;

  foldExit<S1, S2, R2, E2, A2, A3, R3, E3>(
    failure: F.FunctionN<[ex.Cause<E>], Eff<S1, R2, E2, A2>>,
    success: F.FunctionN<[A], Eff<S2, R3, E3, A3>>
  ): EffIO<S | S1 | S2, R & R2 & R3, E2 | E3, A2 | A3>;

  result(): EffIO<S, R, T.NoErr, ex.Exit<E, A>>;

  as<B>(b: B): EffIO<S, R, E, B>;

  asM<S1, R2, E2, B>(b: Eff<S1, R2, E2, B>): EffIO<S | S1, R & R2, E | E2, B>;

  map<B>(f: (a: A) => B): EffIO<S, R, E, B>;

  bimap<E2, B>(
    leftMap: F.FunctionN<[E], E2>,
    rightMap: F.FunctionN<[A], B>
  ): EffIO<S, R, E2, B>;

  mapError<E2>(f: F.FunctionN<[E], E2>): EffIO<S, R, E2, A>;

  asUnit(): EffIO<S, R, E, void>;

  fork(): EffIO<SYNC, R, never, Fiber<S, E, A>>;

  flow<S2, R2, E2, A2>(
    f: (e: Eff<S, R, E, A>) => Eff<S2, R2, E2, A2>
  ): EffIO<S | S2, R2, E2, A2>;

  done(): Eff<S, R, E, A>;

  runToPromiseExit(r: T.OrVoid<R>): Promise<ex.Exit<E, A>>;

  runToPromise(r: T.OrVoid<R>): Promise<A>;

  run(cb: (ex: ex.Exit<E, A>) => void, r: T.OrVoid<R>): F.Lazy<void>;
}
