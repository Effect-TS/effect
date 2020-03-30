import {
  either as Ei,
  function as F,
  option as Op,
  task as TA,
  taskEither as TE,
  array as Ar,
} from "fp-ts";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import * as T from "./effect";
import * as ex from "./original/exit";
import { Runtime } from "./original/runtime";
import { Monad4E, MonadThrow4E, Alt4E } from "./overloadEff";
import { mergeDeep } from "./utils/merge";
import { Bifunctor4 } from "fp-ts/lib/Bifunctor";
import { Functor4 } from "fp-ts/lib/Functor";
import { tuple2, fst, snd } from "./original/support/util";
import { DriverImpl } from "./driver";
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

export function zipWith<S1, S2, R, E, A, R2, E2, B, C>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Eff<S1 | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)));
}

export function zip<S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
): Eff<S1 | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith(first, second, tuple2);
}

export function pure<A>(a: A): Eff<SYNC, T.NoEnv, T.NoErr, A> {
  return new T.EffectIO(T.EffectTag.Pure, a) as any;
}

export function of_<S, R, E, A>(a: A): Eff<S, R, E, A> {
  return new T.EffectIO(T.EffectTag.Pure, a) as any;
}

export function applyFirst<S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
): Eff<S1 | S2, R & R2, E | E2, A> {
  return zipWith(first, second, fst);
}

export function applySecond<S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: Eff<S2, R2, E2, B>
): Eff<S1 | S2, R & R2, E | E2, B> {
  return zipWith(first, second, snd);
}

export function applySecondL<S1, S2, R, E, A, R2, E2, B>(
  first: Eff<S1, R, E, A>,
  second: F.Lazy<Eff<S2, R2, E2, B>>
): Eff<S1 | S2, R & R2, E | E2, B> {
  return chain_(first, second);
}

export function ap__<S1, S2, R, E, A, R2, E2, B>(
  ioa: Eff<S1, R, E, A>,
  iof: Eff<S2, R2, E2, F.FunctionN<[A], B>>
): Eff<S1 | S2, R & R2, E | E2, B> {
  return zipWith(ioa, iof, (a, f) => f(a));
}

export function flip<S, R, E, A>(io: Eff<S, R, E, A>): Eff<S, R, A, E> {
  return foldExit_(
    io,
    (error) => (error._tag === "Raise" ? pure(error.error) : completed(error)),
    raiseError
  );
}

export function forever<S, R, E, A>(io: Eff<S, R, E, A>): Eff<S, R, E, never> {
  return chain_(io, () => forever(io));
}

function map_<S1, R, E, A, B>(
  base: Eff<S1, R, E, A>,
  f: F.FunctionN<[A], B>
): Eff<S1, R, E, B> {
  return base._tag === T.EffectTag.Pure
    ? (new T.EffectIO(
        T.EffectTag.Pure,
        f(((base as any) as T.Pure<any>).f0)
      ) as any)
    : (new T.EffectIO(T.EffectTag.Map, base, f) as any);
}

function ap_<S1, S2, R, E, A, B, R2, E2>(
  iof: Eff<S1, R, E, F.FunctionN<[A], B>>,
  ioa: Eff<S2, R2, E2, A>
): Eff<S1 | S2, R & R2, E | E2, B> {
  return zipWith(iof, ioa, (f, a) => f(a));
}

function chain_<S1, S2, R, E, A, R2, E2, B>(
  inner: Eff<S1, R, E, A>,
  bind: F.FunctionN<[A], Eff<S2, R2, E2, B>>
): Eff<S1 | S2, R & R2, E | E2, B> {
  return inner._tag === T.EffectTag.Pure
    ? (bind((inner as any).f0) as any)
    : (new T.EffectIO(T.EffectTag.Chain, inner, bind) as any);
}

export function raised<E, A = never>(e: ex.Cause<E>): Eff<SYNC, T.NoEnv, E, A> {
  return new T.EffectIO(T.EffectTag.Raised, e) as any;
}

export function raiseError<E, A = never>(e: E): Eff<SYNC, T.NoEnv, E, A> {
  return raised(ex.raise(e));
}

export function raiseAbort(u: unknown): Eff<SYNC, T.NoEnv, T.NoErr, never> {
  return raised(ex.abort(u));
}

export const raiseInterrupt: Eff<SYNC, T.NoEnv, T.NoErr, never> = raised(
  ex.interrupt
);

export function completed<E, A>(exit: ex.Exit<E, A>): Eff<SYNC, T.NoEnv, E, A> {
  return new T.EffectIO(T.EffectTag.Completed, exit) as any;
}

export function suspended<S, R, E, A>(
  thunk: F.Lazy<Eff<S, R, E, A>>
): Eff<S, R, E, A> {
  return new T.EffectIO(T.EffectTag.Suspended, thunk) as any;
}

export function sync<E = T.NoErr, A = unknown>(
  thunk: F.Lazy<A>
): Eff<SYNC, T.NoEnv, E, A> {
  return suspended(() => pure(thunk()));
}

export function trySync<E = unknown, A = unknown>(
  thunk: F.Lazy<A>
): Eff<SYNC, T.NoEnv, E, A> {
  return suspended(() => {
    try {
      return pure(thunk());
    } catch (e) {
      return raiseError(e);
    }
  });
}

export function trySyncMap<E = unknown>(
  onError: (e: unknown) => E
): <A = unknown>(thunk: F.Lazy<A>) => Eff<SYNC, T.NoEnv, E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk());
      } catch (e) {
        return raiseError(onError(e));
      }
    });
}

export function async<E, A>(op: T.AsyncFn<E, A>): Eff<ASYNC, T.NoEnv, E, A> {
  return new T.EffectIO(T.EffectTag.Async, op) as any;
}

export function asyncTotal<A>(
  op: F.FunctionN<[F.FunctionN<[A], void>], T.AsyncCancelContFn>
): Eff<ASYNC, T.NoEnv, T.NoErr, A> {
  return async((callback) => op((a) => callback(Ei.right(a))));
}

export function interruptibleRegion<S, R, E, A>(
  inner: Eff<S, R, E, A>,
  flag: boolean
): Eff<S, R, E, A> {
  return new T.EffectIO(T.EffectTag.InterruptibleRegion, flag, inner) as any;
}
export function encaseOption<E, A>(
  o: Op.Option<A>,
  onError: F.Lazy<E>
): Eff<SYNC, T.NoEnv, E, A> {
  return new T.EffectIO(T.EffectTag.PureOption, o, onError) as any;
}

export function chainOption<E>(
  onEmpty: F.Lazy<E>
): <A, B>(
  bind: F.FunctionN<[A], Op.Option<B>>
) => <S, R, E2>(eff: Eff<S, R, E2, A>) => Eff<S, R, E | E2, B> {
  return (bind) => (inner) =>
    chain_(inner, (a) => encaseOption(bind(a), onEmpty));
}

export function encaseEither<E, A>(
  e: Ei.Either<E, A>
): Eff<SYNC, T.NoEnv, E, A> {
  return new T.EffectIO(T.EffectTag.PureEither, e) as any;
}

export function chainEither<A, E, B>(
  bind: F.FunctionN<[A], Ei.Either<E, B>>
): <S, R, E2>(eff: Eff<S, R, E2, A>) => Eff<S, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)));
}

function foldExit_<S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
  inner: Eff<S1, R, E1, A1>,
  failure: F.FunctionN<[ex.Cause<E1>], Eff<S2, R2, E2, A2>>,
  success: F.FunctionN<[A1], Eff<S3, R3, E3, A3>>
): Eff<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  return new T.EffectIO(T.EffectTag.Collapse, inner, failure, success) as any;
}

function chainError_<S1, S2, R, E1, R2, E2, A, A2>(
  io: Eff<S1, R, E1, A>,
  f: F.FunctionN<[E1], Eff<S2, R2, E2, A2>>
): Eff<S1 | S2, R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise" ? f(cause.error) : (completed(cause) as any),
    pure
  ) as any;
}

export function chainError<S1, R, E1, E2, A>(
  f: F.FunctionN<[E1], Eff<S1, R, E2, A>>
): <S2, R2>(rio: Eff<S2, R2, E1, A>) => Eff<S1 | S2, R & R2, E2, A> {
  return (io) => chainError_(io, f);
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: F.FunctionN<[E1], E2>
): <S, R, A>(io: Eff<S, R, E1, A>) => Eff<S, R, E2, A> {
  return <S, R, A>(io: Eff<S, R, E1, A>) => mapLeft_(io, f);
}

export function orAbort<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<S, R, T.NoErr, A> {
  return chainError_(io, raiseAbort);
}

export function uninterruptible<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<S, R, E, A> {
  return interruptibleRegion(io, false);
}

export function interruptible<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<S, R, E, A> {
  return interruptibleRegion(io, true);
}

export function after(ms: number): Eff<ASYNC, T.NoEnv, T.NoErr, void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  );
}

export function fromPromise<A>(
  thunk: F.Lazy<Promise<A>>
): Eff<ASYNC, T.NoEnv, unknown, A> {
  return uninterruptible(
    async<unknown, A>((callback) => {
      thunk()
        .then((v) => callback(Ei.right(v)))
        .catch((e) => callback(Ei.left(e)));
      /* istanbul ignore next */
      return (cb) => {
        cb();
      };
    })
  );
}

export function encaseTask<A>(
  task: TA.Task<A>
): Eff<ASYNC, T.NoEnv, T.NoErr, A> {
  return orAbort(fromPromise(task));
}

export function chainTask<A, B>(
  bind: F.FunctionN<[A], TA.Task<B>>
): <S, R, E2>(eff: Eff<S, R, E2, A>) => Eff<S | ASYNC, R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)));
}

export function encaseTaskEither<E, A>(
  taskEither: TE.TaskEither<E, A>
): Eff<ASYNC, T.NoEnv, E, A> {
  return async<E, A>((callback) => {
    taskEither().then(callback);
    /* istanbul ignore next */
    return (cb) => {
      cb();
    };
  });
}

export function chainTaskEither<A, E, B>(
  bind: F.FunctionN<[A], TE.TaskEither<E, B>>
): <S, R, E2>(eff: Eff<S, R, E2, A>) => Eff<ASYNC, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)));
}

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

export function withRuntime<S, E, A>(
  f: F.FunctionN<[Runtime], Eff<S, T.NoEnv, E, A>>
): Eff<S, T.NoEnv, E, A> {
  return chain_(accessRuntime, f) as any;
}

export function accessEnvironment<R>(): Eff<SYNC, R, T.NoErr, R> {
  return new T.EffectIO(T.EffectTag.AccessEnv) as any;
}

export function accessM<S, R, R2, E, A>(
  f: F.FunctionN<[R], Eff<S, R2, E, A>>
): Eff<S, R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f) as any;
}

export function access<R, A, E = T.NoErr>(
  f: F.FunctionN<[R], A>
): Eff<SYNC, R, E, A> {
  return map_(accessEnvironment<R>(), f);
}

export function mergeEnv<A>(a: A): <B>(b: B) => A & B {
  return (b) => mergeDeep(a, b);
}

export const provideAll = <R>(r: R) => <S, E, A>(ma: Eff<S, R, E, A>) =>
  (new T.EffectIO(T.EffectTag.ProvideEnv, ma, r) as any) as Eff<
    S,
    unknown,
    E,
    A
  >;

export const provide = <R>(r: R) => <S, R2, E, A>(
  ma: Eff<S, R2 & R, E, A>
): Eff<S, R2, E, A> => accessM((r2: R2) => provideAll(mergeEnv(r2)(r))(ma));

export const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Eff<S, R, E, A>
): Eff<S, R2, E, A> => accessM((r2: R2) => provideAll(f(r2))(ma));

export interface Provider<Environment, Module, S2, E2> {
  <S1, R, E, A>(e: Eff<S1, Module & R, E, A>): Eff<
    S1 | S2,
    Environment & R,
    E | E2,
    A
  >;
}

export function provideS<R>(r: R): Provider<unknown, R, SYNC, never> {
  return <S1, R2, E, A>(eff: Eff<S1, R2 & R, E, A>): Eff<S1, R2, E, A> =>
    provideR((r2: R2) => ({ ...r2, ...r }))(eff);
}

export function provideSO<R>(r: R): Provider<unknown, R, SYNC, never> {
  return <S1, R2, E, A>(eff: Eff<S1, R2 & R, E, A>): Eff<S1, R2, E, A> =>
    provideR((r2: R2) => ({ ...r, ...r2 }))(eff);
}

export const provideSW = <M>() => <S1, R, E, A>(res: Eff<S1, R, E, A>) => (
  f: (a: A) => M
): Provider<R, M, S1, E> => <S2, R2, E2, A2>(
  eff: Eff<S2, R2 & M, E2, A2>
): Eff<S1 | S2, R2 & R, E | E2, A2> =>
  chain_(res, (a) => provideS<M>(f(a))(eff));

export function provideSM<S1, R, R3, E2>(
  rm: Eff<S1, R3, E2, R>
): Provider<R3, R, S1, E2> {
  return <S2, R2, E, A>(
    eff: Eff<S2, R2 & R, E, A>
  ): Eff<S1 | S2, R2 & R3, E | E2, A> =>
    chain_(rm, (r) => provideR((r2: R2) => ({ ...r2, ...r }))(eff));
}

export const provideM = <S1, R2, R, E2>(
  f: Eff<S1, R2, E2, R>
): Provider<R2, R, S1, E2> => (ma) => chain_(f, (r) => provide(r)(ma));

export const provideSomeM = <S1, R2, R, E2>(
  f: Eff<S1, R2, E2, R>
): Provider<R2, R, S1, E2> => <S2, E, A, R3>(
  ma: Eff<S2, R & R3, E, A>
): Eff<S1 | S2, R2 & R3, E | E2, A> => chain_(f, (r) => provide(r)(ma));

export function lift<A, B>(
  f: F.FunctionN<[A], B>
): <S, R, E>(io: Eff<S, R, E, A>) => Eff<S, R, E, B> {
  return (io) => map_(io, f);
}

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

function bimap_<S, R, E1, E2, A, B>(
  io: Eff<S, R, E1, A>,
  leftMap: F.FunctionN<[E1], E2>,
  rightMap: F.FunctionN<[A], B>
): Eff<S, R, E2, B> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise"
        ? raiseError(leftMap(cause.error))
        : completed(cause),
    F.flow(rightMap, pure)
  );
}

const mapLeft_: EffMonad["mapLeft"] = (io, f) =>
  chainError_(io, F.flow(f, raiseError));

const alt_: EffMonad["alt"] = chainError_;

const chainTap_ = <S1, S2, R, E, A, R2, E2>(
  inner: Eff<S1, R, E, A>,
  bind: F.FunctionN<[A], Eff<S2, R2, E2, unknown>>
): Eff<S1 | S2, R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a));

export function chainTap<S1, R, E, A>(
  bind: F.FunctionN<[A], Eff<S1, R, E, unknown>>
): <S2, R2, E2>(inner: Eff<S2, R2, E2, A>) => Eff<S1 | S2, R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind);
}

export function as<S, R, E, A, B>(io: Eff<S, R, E, A>, b: B): Eff<S, R, E, B> {
  return map_(io, F.constant(b));
}

export function asUnit<S, R, E, A>(io: Eff<S, R, E, A>): Eff<S, R, E, void> {
  return as(io, undefined);
}

export const unit: Eff<SYNC, T.NoEnv, T.NoErr, void> = pure(undefined);

export function to<B>(
  b: B
): <S, R, E, A>(io: Eff<S, R, E, A>) => Eff<S, R, E, B> {
  return (io) => as(io, b);
}

export type InterruptMaskCutout<S, R, E, A> = F.FunctionN<
  [Eff<S, R, E, A>],
  Eff<S, R, E, A>
>;

function makeInterruptMaskCutout<S, R, E, A>(
  state: boolean
): InterruptMaskCutout<S, R, E, A> {
  return (inner: Eff<S, R, E, A>) => interruptibleRegion(inner, state);
}

export function uninterruptibleMask<S, R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<S, R, E, A>], Eff<S, R, E, A>>
): Eff<S, R, E, A> {
  return chain_(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<S, R, E, A>(flag);
    return uninterruptible(f(cutout));
  });
}

export function result<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<S, R, T.NoErr, ex.Exit<E, A>> {
  return foldExit_(
    io,
    (c) => pure(c) as Eff<S, R, T.NoErr, ex.Exit<E, A>>,
    (d) => pure(ex.done(d))
  );
}

function combineFinalizerExit<E, A>(
  fiberExit: ex.Exit<E, A>,
  releaseExit: ex.Exit<E, unknown>
): ex.Exit<E, A> {
  if (fiberExit._tag === "Done" && releaseExit._tag === "Done") {
    return fiberExit;
  } else if (fiberExit._tag === "Done") {
    return releaseExit as ex.Cause<E>;
  } else if (releaseExit._tag === "Done") {
    return fiberExit;
  } else {
    // TODO: Figure out how to sanely report both of these, we swallow them currently
    // This would affect chainError (i.e. assume multiples are actually an abort condition that happens to be typed)
    return fiberExit;
  }
}

export function bracketExit<S1, S2, S3, R, E, A, B, R2, E2, R3, E3>(
  acquire: Eff<S1, R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], Eff<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Eff<S3, R3, E3, B>>
): Eff<S1 | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  return uninterruptibleMask((cutout) =>
    chain_(acquire, (a) =>
      chain_(result(cutout(use(a))), (exit) =>
        chain_(result(release(a, exit as ex.Exit<E | E3, B>)), (finalize) =>
          completed(combineFinalizerExit(exit, finalize))
        )
      )
    )
  );
}

export function bracket<S1, S2, S3, R, E, A, R2, E2, R3, E3, B>(
  acquire: Eff<S1, R, E, A>,
  release: F.FunctionN<[A], Eff<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Eff<S3, R3, E3, B>>
): Eff<S1 | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use);
}

function onInterrupted_<S1, S2, R, E, A, R2, E2>(
  ioa: Eff<S1, R, E, A>,
  finalizer: Eff<S2, R2, E2, unknown>
): Eff<S1 | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  );
}

function onComplete_<S1, S2, R, E, A, R2, E2>(
  ioa: Eff<S1, R, E, A>,
  finalizer: Eff<S2, R2, E2, unknown>
): Eff<S1 | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) =>
        completed(combineFinalizerExit(exit, finalize))
      )
    )
  );
}

export function onComplete<S2, R2, E2>(finalizer: Eff<S2, R2, E2, unknown>) {
  return <S1, R, E, A>(ioa: Eff<S1, R, E, A>) => onComplete_(ioa, finalizer);
}

export function onInterrupted<S2, R2, E2>(finalizer: Eff<S2, R2, E2, unknown>) {
  return <S1, R, E, A>(ioa: Eff<S1, R, E, A>) => onInterrupted_(ioa, finalizer);
}

export function combineInterruptExit<S1, S2, R, E, A, R2, E2>(
  ioa: Eff<S1, R, E, A>,
  finalizer: Eff<S2, R2, E2, ex.Interrupt[]>
): Eff<S1 | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [exit.error, ...finalize.value.map((x) => x.error)],
                Ar.filter((x): x is Error => x !== undefined)
              );

              return errors.length > 0
                ? completed(
                    ex.interruptWithErrorAndOthers(
                      errors[0],
                      Ar.dropLeft(1)(errors)
                    )
                  )
                : completed(exit);
            } else {
              console.warn("BUG: interrupt finalizer should not fail");
              return completed(exit);
            }
          })
        : completed(exit)
    )
  );
}

export const shifted: Eff<ASYNC, T.NoEnv, T.NoErr, void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) =>
      runtime.dispatchLater(callback, undefined, 0)
    )
  )
);

export function shiftBefore<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<ASYNC, R, E, A> {
  return applySecond(shifted, io);
}

export function shiftAfter<S, R, E, A>(
  io: Eff<S, R, E, A>
): Eff<ASYNC, R, E, A> {
  return applyFirst(io, shifted);
}

export const never: Eff<ASYNC, T.NoEnv, T.NoErr, never> = asyncTotal(() => {
  const handle = setInterval(() => {
    //
  }, 60000);
  /* istanbul ignore next */
  return (cb) => {
    clearInterval(handle);
    cb();
  };
});

export function delay<S, R, E, A>(
  inner: Eff<S, R, E, A>,
  ms: number
): Eff<ASYNC, R, E, A> {
  return applySecond(after(ms), inner);
}

export function liftDelay(
  ms: number
): <S, R, E, A>(io: Eff<S, R, E, A>) => Eff<ASYNC, R, E, A> {
  return (io) => delay(io, ms);
}

export interface Fiber<S, E, A> {
  readonly name: Op.Option<string>;
  readonly interrupt: Eff<S, T.NoEnv, T.NoErr, ex.Interrupt>;
  readonly wait: Eff<ASYNC, T.NoEnv, T.NoErr, ex.Exit<E, A>>;
  readonly join: Eff<ASYNC, T.NoEnv, E, A>;
  readonly result: Eff<ASYNC, T.NoEnv, E, Op.Option<A>>;
  readonly isComplete: Eff<S, T.NoEnv, T.NoErr, boolean>;
}

export function makeFiber<S, R, E, A>(
  init: Eff<S, R, E, A>,
  name?: string
): Eff<SYNC, R, T.NoErr, Fiber<S, E, A>> {
  return accessM((r: R) =>
    chain_(accessRuntime, (runtime) =>
      sync(() => {
        const driver = new DriverImpl<E, A>(runtime);
        const fiber = new T.FiberImpl<E, A>(driver, name);
        driver.start(provideAll(r)(init) as any);
        return fiber as any;
      })
    )
  );
}

export function fork<S, R, E, A>(
  io: Eff<S, R, E, A>,
  name?: string
): Eff<SYNC, R, T.NoErr, Fiber<S, E, A>> {
  return makeFiber(io, name);
}

export function raceFold<S1, S2, S3, S4, R, R2, R3, R4, E1, E2, E3, A, B, C>(
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
): Eff<S1 | S2 | S3 | S4, R & R2 & R3 & R4, E3, C> {
  return T.raceFold(
    first as any,
    second as any,
    onFirstWon as any,
    onSecondWon as any
  ) as any;
}

export function timeoutFold<S1, S2, S3, R, E1, E2, A, B>(
  source: Eff<S1, R, E1, A>,
  ms: number,
  onTimeout: F.FunctionN<[Fiber<S1, E1, A>], Eff<S2, T.NoEnv, E2, B>>,
  onCompleted: F.FunctionN<[ex.Exit<E1, A>], Eff<S3, T.NoEnv, E2, B>>
): Eff<ASYNC, R, E2, B> {
  return raceFold(
    source,
    after(ms),
    /* istanbul ignore next */
    (exit, delayFiber) => applySecond(delayFiber.interrupt, onCompleted(exit)),
    (_, fiber) => onTimeout(fiber)
  );
}

function interruptLoser<S, R, E, A>(
  exit: ex.Exit<E, A>,
  loser: Fiber<S, E, A>
): Eff<S, R, E, A> {
  return applySecond(loser.interrupt, completed(exit));
}

export function raceFirst<S1, S2, R, R2, E, A>(
  io1: Eff<S1, R, E, A>,
  io2: Eff<S2, R2, E, A>
): Eff<S1 | S2, R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser);
}

function fallbackToLoser<S, R, E, A>(
  exit: ex.Exit<E, A>,
  loser: Fiber<S, E, A>
): Eff<ASYNC, R, E, A> {
  return exit._tag === "Done"
    ? applySecond(loser.interrupt, completed(exit))
    : loser.join;
}

export function race<S1, S2, R, R2, E, A>(
  io1: Eff<S1, R, E, A>,
  io2: Eff<S2, R2, E, A>
): Eff<ASYNC, R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser);
}

export function parZipWith<S1, S2, R, R2, E, E2, A, B, C>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Eff<ASYNC, R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith(aFiber.join, completed(bExit), f)
  );
}

export function parZip<S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
): Eff<ASYNC, R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2);
}

export function parApplyFirst<S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
): Eff<ASYNC, R & R2, E, A> {
  return parZipWith(ioa, iob, fst);
}

export function parApplySecond<S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iob: Eff<S2, R2, E, B>
): Eff<ASYNC, R & R2, E, B> {
  return parZipWith(ioa, iob, snd);
}

export function parAp<S1, S2, R, R2, E, A, B>(
  ioa: Eff<S1, R, E, A>,
  iof: Eff<S2, R2, E, F.FunctionN<[A], B>>
): Eff<ASYNC, R & R2, E, B> {
  return parZipWith(ioa, iof, (a, f) => f(a));
}

export function parAp_<S1, S2, R, R2, E, E2, A, B>(
  iof: Eff<S1, R, E, F.FunctionN<[A], B>>,
  ioa: Eff<S2, R2, E2, A>
): Eff<ASYNC, R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a));
}

const pureNone = pure(Op.none);

export function timeoutOption<S, R, E, A>(
  source: Eff<S, R, E, A>,
  ms: number
): Eff<ASYNC, R, E, Op.Option<A>> {
  return timeoutFold(
    source,
    ms,
    (actionFiber) => applySecond(actionFiber.interrupt, pureNone),
    (exit) => map_(completed(exit), Op.some)
  );
}

export function run<S, E, A>(
  io: Eff<S, {}, E, A>,
  callback?: F.FunctionN<[ex.Exit<E, A>], void>
): F.Lazy<void> {
  const driver = new DriverImpl<E, A>();
  if (callback) {
    driver.onExit(callback);
  }
  driver.start(io as any);
  return () => driver.interrupt();
}

export function runSync<E, A>(io: Eff<SYNC, {}, E, A>): ex.Exit<E, A> {
  const res = new DriverSyncImpl<E, A>().start(io as any)

  if (res._tag === "Left") {
    throw res.left
  } else {
    return res.right
  }
}

export function runUnsafeSync<E, A>(io: Eff<SYNC, {}, E, A>): A {
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

export function runToPromise<S, E, A>(io: Eff<S, {}, E, A>): Promise<A> {
  return new Promise((resolve, reject) =>
    run(io, (exit) => {
      switch (exit._tag) {
        case "Done":
          resolve(exit.value);
          return;
        case "Abort":
          reject(exit.abortedWith);
          return;
        case "Raise":
          reject(exit.error);
          return;
        case "Interrupt":
          reject();
          return;
      }
    })
  );
}

export function runToPromiseExit<S, E, A>(
  io: Eff<S, {}, E, A>
): Promise<ex.Exit<E, A>> {
  return new Promise((result) => run(io, result));
}

export const eff: EffMonad = {
  URI,
  ap: ap_,
  chain: chain_,
  map: map_,
  of: of_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  mapError: mapLeft_,
  throwError: raiseError,
  chainError: chainError_,
  foldExit: foldExit_,
  chainTap: chainTap_,
  alt: alt_,
  onInterrupted: onInterrupted_,
  onComplete: onComplete_,
};

export const parEff: Monad4E<URI> & Bifunctor4<URI> & MonadThrow4E<URI> = {
  URI,
  map: map_,
  of: pure,
  ap: parAp_,
  chain: chain_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  throwError: raiseError,
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

export function liftEither<A, E, B>(
  f: F.FunctionN<[A], Ei.Either<E, B>>
): F.FunctionN<[A], Eff<SYNC, T.NoEnv, E, B>> {
  return (a) => fromEither(f(a));
}

export const retype = <S, R, E, A>(
  _: Eff<S, R, E, A>
): unknown extends S ? AsyncEff<R, E, A> : SyncEff<R, E, A> => _ as any;

export const encaseSync = <R, E, A>(_: T.Effect<R, E, A>): SyncEff<R, E, A> =>
  pipe(
    access((r: R) => T.runSync(T.provideAll(r)(_))),
    chainEither(identity),
    orAbort,
    chain(completed)
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
}
