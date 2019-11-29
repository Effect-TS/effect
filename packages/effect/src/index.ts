/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/wave.ts
 */

import M from "deepmerge";
import { Do } from "fp-ts-contrib/lib/Do";
import * as Ar from "fp-ts/lib/Array";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import * as Ei from "fp-ts/lib/Either";
import * as either from "fp-ts/lib/Either";
import { Either, left, right } from "fp-ts/lib/Either";
import { constant, flow, FunctionN, identity, Lazy } from "fp-ts/lib/function";
import { Monoid } from "fp-ts/lib/Monoid";
import * as Op from "fp-ts/lib/Option";
import * as option from "fp-ts/lib/Option";
import { none, Option, some } from "fp-ts/lib/Option";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import { Semigroup } from "fp-ts/lib/Semigroup";
import * as ex from "waveguide/lib/exit";
import { Cause, Exit } from "waveguide/lib/exit";
import { Runtime } from "waveguide/lib/runtime";
import { fst, snd, tuple2 } from "waveguide/lib/support/util";
import { Deferred, makeDeferred } from "./deferred";
import { Driver, makeDriver } from "./driver";
import {
  Alt3EC,
  Monad3E,
  Monad3EC,
  MonadThrow3E,
  MonadThrow3EC
} from "./overload";
import { makeRef, Ref } from "./ref";
import * as S from "./semaphore";

export enum EffectTag {
  Pure,
  Raised,
  Completed,
  Suspended,
  Async,
  Chain,
  Collapse,
  InterruptibleRegion,
  AccessInterruptible,
  AccessRuntime
}

export type NoEnv = unknown;
export type NoErr = never;
export type Env = { [k: string]: any };

/**
 * A description of an effect to perform
 */
export type Effect<R, E, A> = (
  _: R
) =>
  | Pure<E, A>
  | Raised<E, A>
  | Completed<E, A>
  | Suspended<E, A>
  | Async<E, A>
  | Chain<E, any, A> // eslint-disable-line @typescript-eslint/no-explicit-any
  | Collapse<any, E, any, A> // eslint-disable-line @typescript-eslint/no-explicit-any
  | InterruptibleRegion<E, A>
  | AccessInterruptible<E, A>
  | AccessRuntime<E, A>;

export interface Pure<E, A> {
  readonly _tag: EffectTag.Pure;

  readonly value: A;
}

/**
 * An IO has succeeded
 * @param a the value
 */
export function pure<A>(a: A): Effect<NoEnv, NoErr, A> {
  return () => ({
    _tag: EffectTag.Pure,
    value: a
  });
}

export interface Raised<E, A> {
  readonly _tag: EffectTag.Raised;
  readonly error: Cause<E>;
}

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: Cause<E>): Effect<NoEnv, E, A> {
  return () => ({ _tag: EffectTag.Raised, error: e });
}

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E, A = never>(e: E): Effect<NoEnv, E, A> {
  return raised(ex.raise(e));
}

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Effect<NoEnv, NoErr, never> {
  return raised(ex.abort(u));
}

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: Effect<NoEnv, NoErr, never> = raised(ex.interrupt);

export interface Completed<E, A> {
  readonly _tag: EffectTag.Completed;

  readonly exit: Exit<E, A>;
}

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E, A>(exit: Exit<E, A>): Effect<NoEnv, E, A> {
  return () => ({
    _tag: EffectTag.Completed,
    exit
  });
}

export interface Suspended<E, A> {
  readonly _tag: EffectTag.Suspended;

  readonly thunk: Lazy<Effect<NoEnv, E, A>>;
}

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export function suspended<R, E, A>(
  thunk: Lazy<Effect<R, E, A>>
): Effect<R, E, A> {
  return r => ({
    _tag: EffectTag.Suspended,
    thunk: () => provideAll(r)(thunk())
  });
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export function sync<E = NoErr, A = unknown>(
  thunk: Lazy<A>
): Effect<NoEnv, E, A> {
  return suspended(() => pure(thunk()));
}

export function trySync<E = unknown, A = unknown>(
  thunk: Lazy<A>
): Effect<NoEnv, E, A> {
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
): <A = unknown>(thunk: Lazy<A>) => Effect<NoEnv, E, A> {
  return thunk =>
    suspended(() => {
      try {
        return pure(thunk());
      } catch (e) {
        return raiseError(onError(e));
      }
    });
}

export interface Async<E, A> {
  readonly _tag: EffectTag.Async;
  readonly op: FunctionN<[FunctionN<[Either<E, A>], void>], Lazy<void>>;
}

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(
  op: FunctionN<[FunctionN<[Either<E, A>], void>], Lazy<void>>
): Effect<NoEnv, E, A> {
  return () => ({
    _tag: EffectTag.Async,
    op
  });
}

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export function asyncTotal<A>(
  op: FunctionN<[FunctionN<[A], void>], Lazy<void>>
): Effect<NoEnv, NoErr, A> {
  return async(callback => op(a => callback(right(a))));
}

export interface InterruptibleRegion<E, A> {
  readonly _tag: EffectTag.InterruptibleRegion;

  readonly inner: Effect<NoEnv, E, A>;
  readonly flag: boolean;
}

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<R, E, A>(
  inner: Effect<R, E, A>,
  flag: boolean
): Effect<R, E, A> {
  return r => ({
    _tag: EffectTag.InterruptibleRegion,
    flag,
    inner: provideAll(r)(inner)
  });
}

export interface Chain<E, Z, A> {
  readonly _tag: EffectTag.Chain;
  readonly inner: Effect<NoEnv, E, Z>;
  readonly bind: FunctionN<[Z], Effect<NoEnv, E, A>>;
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
function chain_<R, E, A, R2, E2, B>(
  inner: Effect<R, E, A>,
  bind: FunctionN<[A], Effect<R2, E2, B>>
): Effect<R & R2, E | E2, B> {
  return r => ({
    _tag: EffectTag.Chain,
    inner: provideAll(r)(inner),
    bind: a => provideAll(r)(bind(a))
  });
}

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Either<E, A>): Effect<NoEnv, E, A> {
  return pipe(e, either.fold<E, A, Effect<NoEnv, E, A>>(raiseError, pure));
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(
  o: Option<A>,
  onError: Lazy<E>
): Effect<NoEnv, E, A> {
  return pipe(
    o,
    option.map<A, Effect<NoEnv, E, A>>(pure),
    option.getOrElse<Effect<NoEnv, E, A>>(() => raiseError(onError()))
  );
}

export interface Collapse<E1, E2, A1, A2> {
  readonly _tag: EffectTag.Collapse;

  readonly inner: Effect<NoEnv, E1, A1>;
  readonly failure: FunctionN<[Cause<E1>], Effect<NoEnv, E2, A2>>;
  readonly success: FunctionN<[A1], Effect<NoEnv, E2, A2>>;
}

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export function foldExit<E1, RF, E2, A1, E3, A2, RS>(
  failure: FunctionN<[Cause<E1>], Effect<RF, E2, A2>>,
  success: FunctionN<[A1], Effect<RS, E3, A2>>
): <R>(io: Effect<R, E1, A1>) => Effect<RF & RS & R, E2 | E3, A2> {
  return io => foldExit_(io, failure, success);
}

export interface AccessInterruptible<E, A> {
  readonly _tag: EffectTag.AccessInterruptible;

  readonly f: FunctionN<[boolean], A>;
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: Effect<NoEnv, NoErr, boolean> = () => ({
  _tag: EffectTag.AccessInterruptible,
  f: identity
});

export interface AccessRuntime<E, A> {
  readonly _tag: EffectTag.AccessRuntime;

  readonly f: FunctionN<[Runtime], A>;
}

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Effect<NoEnv, NoErr, Runtime> = () => ({
  _tag: EffectTag.AccessRuntime,
  f: identity
});

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */
export function withRuntime<E, A>(
  f: FunctionN<[Runtime], Effect<NoEnv, E, A>>
): Effect<NoEnv, E, A> {
  return chain_(accessRuntime as Effect<NoEnv, E, Runtime>, f);
}

export function accessEnvironment<R extends Env>(): Effect<R, NoErr, R> {
  return r => ({
    _tag: EffectTag.Pure,
    value: r
  });
}

export function accessM<R extends Env, R2, E, A>(
  f: FunctionN<[R], Effect<R2, E, A>>
): Effect<R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f);
}

export function access<R extends Env, A, E = NoErr>(
  f: FunctionN<[R], A>
): Effect<R, E, A> {
  return chain_(accessEnvironment<R>(), r => pure(f(r)));
}

export function mergeEnv<A>(a: A): <B>(b: B) => A & B {
  return b => M.all([a, b], { clone: false });
}

export const noEnv = {};

/**
 * Provides partial environment, to be used only in top-level
 * for deeper level is better to use provideR or provideAll
 */

export const provide = <R>(r: R) => <R2, E, A>(
  ma: Effect<R2 & R, E, A>
): Effect<R2, E, A> =>
  accessM((r2: R2) => provideAll(M.all([r, r2], { clone: false }) as any)(ma));

/**
 * Provides partial environment, to be used only in top-level
 * for deeper level is better to use provideR or provideAll
 */

export const provideR = <R2, R>(f: (r2: R2) => R) => <E, A>(
  ma: Effect<R, E, A>
): Effect<R2, E, A> => accessM((r2: R2) => provideAll(f(r2))(ma));

/**
 * Provides all environment to the child
 */

export const provideAll = <R>(r: R) => <E, A>(
  ma: Effect<R, E, A>
): Effect<NoEnv, E, A> => () => ma(r);

/**
 * Provides all environment necessary to the child effect via an effect
 *
 * Note that this ***should*** be typically used at ***startup time***, not dynamically
 */

export const provideM = <R2, R, E2>(f: Effect<R2, E2, R>) => <E, A>(
  ma: Effect<R, E, A>
): Effect<R2, E | E2, A> => chain_(f, r => provide(r)(ma));

/**
 * Provides some of the environment necessary to the child effect via an effect
 *
 * Note that this should be typically used at startup time, not dynamically
 */

export const provideSomeM = <R2, R, E2>(f: Effect<R2, E2, R>) => <E, A, R3>(
  ma: Effect<R & R3, E, A>
): Effect<R2 & R3, E | E2, A> => chain_(f, r => provide(r)(ma));

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
function map_<R, E, A, B>(
  base: Effect<R, E, A>,
  f: FunctionN<[A], B>
): Effect<R, E, B> {
  return chain_(base, flow(f, pure));
}

/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(
  f: FunctionN<[A], B>
): <R, E>(io: Effect<R, E, A>) => Effect<R, E, B> {
  return <R, E>(io: Effect<R, E, A>) => map_(io, f);
}

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<R, E, A, B>(io: Effect<R, E, A>, b: B): Effect<R, E, B> {
  return map_(io, constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(b: B): <R, E, A>(io: Effect<R, E, A>) => Effect<R, E, B> {
  return io => as(io, b);
}

export function chainTap<R, E, A>(
  bind: FunctionN<[A], Effect<R, E, unknown>>
): <R2, E2>(inner: Effect<R2, E2, A>) => Effect<R & R2, E | E2, A> {
  return inner => chainTap_(inner, bind);
}

const chainTap_ = <R, E, A, R2, E2>(
  inner: Effect<R, E, A>,
  bind: FunctionN<[A], Effect<R2, E2, unknown>>
): Effect<R & R2, E | E2, A> => chain_(inner, a => as(bind(a), a));

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<R, E, A>(io: Effect<R, E, A>): Effect<R, E, void> {
  return as(io, undefined);
}

/**
 * An IO that succeeds immediately with void
 */
export const unit: Effect<NoEnv, NoErr, void> = pure(undefined);

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<R, E1, E2, A>(
  f: FunctionN<[E1], Effect<R, E2, A>>
): <R2>(rio: Effect<R2, E1, A>) => Effect<R & R2, E2, A> {
  return io => chainError_(io, f);
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: FunctionN<[E1], E2>
): <R, A>(io: Effect<R, E1, A>) => Effect<R, E2, A> {
  return <R, A>(io: Effect<R, E1, A>) => mapLeft_(io, f);
}

function bimap_<R, E1, E2, A, B>(
  io: Effect<R, E1, A>,
  leftMap: FunctionN<[E1], E2>,
  rightMap: FunctionN<[A], B>
): Effect<R, E2, B> {
  return foldExit_(
    io,
    cause =>
      cause._tag === ex.ExitTag.Raise
        ? raiseError(leftMap(cause.error))
        : completed(cause),
    flow(rightMap, pure)
  );
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
export function zipWith<R, E, A, R2, E2, B, C>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<R & R2, E | E2, C> {
  return chain_(first, a => map_(second, b => f(a, b)));
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
export function zip<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, readonly [A, B]> {
  return zipWith(first, second, tuple2);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, A> {
  return zipWith(first, second, fst);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, B> {
  return zipWith(first, second, snd);
}

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Lazy<Effect<R2, E2, B>>
): Effect<R & R2, E | E2, B> {
  return chain_(first, () => second());
}

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<R, E, A, R2, E2, B>(
  ioa: Effect<R, E, A>,
  iof: Effect<R2, E2, FunctionN<[A], B>>
): Effect<R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith(ioa, iof, (a, f) => f(a));
}

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
function ap_<R, E, A, B, R2, E2>(
  iof: Effect<R, E, FunctionN<[A], B>>,
  ioa: Effect<R2, E2, A>
): Effect<R & R2, E | E2, B> {
  return zipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<R, E, A>(io: Effect<R, E, A>): Effect<R, A, E> {
  return foldExit_(
    io,
    error =>
      error._tag === ex.ExitTag.Raise ? pure(error.error) : completed(error),
    raiseError
  );
}

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return chain_(io, () => forever(io));
}

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<R, E, A>(
  io: Effect<R, E, A>
): Effect<R, NoErr, Exit<E, A>> {
  return foldExit_(
    io,
    c => pure(c) as Effect<R, NoErr, Exit<E, A>>,
    d => pure(ex.done(d))
  );
}

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return interruptibleRegion(io, true);
}

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return interruptibleRegion(io, false);
}

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Effect<NoEnv, NoErr, void> {
  return chain_(accessRuntime, runtime =>
    asyncTotal(callback => runtime.dispatchLater(() => callback(undefined), ms))
  );
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<R, E, A> = FunctionN<
  [Effect<R, E, A>],
  Effect<R, E, A>
>;

function makeInterruptMaskCutout<R, E, A>(
  state: boolean
): InterruptMaskCutout<R, E, A> {
  return (inner: Effect<R, E, A>) => interruptibleRegion(inner, state);
}

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<R, E, A>(
  f: FunctionN<[InterruptMaskCutout<R, E, A>], Effect<R, E, A>>
): Effect<R, E, A> {
  return chain_(accessInterruptible, flag => {
    const cutout = makeInterruptMaskCutout<R, E, A>(flag);
    return uninterruptible(f(cutout));
  });
}

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export function interruptibleMask<R, E, A>(
  f: FunctionN<[InterruptMaskCutout<R, E, A>], Effect<R, E, A>>
): Effect<R, E, A> {
  return chain_(accessInterruptible, flag =>
    interruptible(f(makeInterruptMaskCutout(flag)))
  );
}

function combineFinalizerExit<E, A>(
  fiberExit: Exit<E, A>,
  releaseExit: Exit<E, unknown>
): Exit<E, A> {
  if (
    fiberExit._tag === ex.ExitTag.Done &&
    releaseExit._tag === ex.ExitTag.Done
  ) {
    return fiberExit;
  } else if (fiberExit._tag === ex.ExitTag.Done) {
    return releaseExit as Cause<E>;
  } else if (releaseExit._tag === ex.ExitTag.Done) {
    return fiberExit;
  } else {
    // TODO: Figure out how to sanely report both of these, we swallow them currently
    // This would affect chainError (i.e. assume multiples are actually an abort condition that happens to be typed)
    return fiberExit;
  }
}

/**
 * Resource acquisition and release construct.
 *
 * Once acquire completes successfully, release is guaranteed to execute following the evaluation of the IO produced by use.
 * Release receives the exit state of use along with the resource.
 * @param acquire
 * @param release
 * @param use
 */

export function bracketExit<R, E, A, B, R2, E2, R3, E3>(
  acquire: Effect<R, E, A>,
  release: FunctionN<[A, Exit<E | E3, B>], Effect<R2, E2, unknown>>,
  use: FunctionN<[A], Effect<R3, E3, B>>
): Effect<R & R2 & R3, E | E2 | E3, B> {
  return uninterruptibleMask(cutout =>
    chain_(acquire, a =>
      chain_(result(cutout(use(a))), exit =>
        chain_(result(release(a, exit as Exit<E | E3, B>)), finalize =>
          completed(combineFinalizerExit(exit, finalize))
        )
      )
    )
  );
}

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export function bracket<R, E, A, R2, E2, R3, E3, B>(
  acquire: Effect<R, E, A>,
  release: FunctionN<[A], Effect<R2, E2, unknown>>,
  use: FunctionN<[A], Effect<R3, E3, B>>
): Effect<R & R2 & R3, E | E2 | E3, B> {
  return bracketExit(acquire, e => release(e), use);
}

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
export function onComplete<R, E, A, R2, E2>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R2, E2, unknown>
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask(cutout =>
    chain_(result(cutout(ioa)), exit =>
      chain_(result(finalizer), finalize =>
        completed(combineFinalizerExit(exit, finalize))
      )
    )
  );
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
export function onInterrupted<R, E, A, R2, E2>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R2, E2, unknown>
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask(cutout =>
    chain_(result(cutout(ioa)), exit =>
      exit._tag === ex.ExitTag.Interrupt
        ? chain_(result(finalizer), finalize =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  );
}

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: Effect<NoEnv, NoErr, void> = uninterruptible(
  chain_(accessRuntime, (
    runtime: Runtime // why does this not trigger noImplicitAny
  ) =>
    asyncTotal<void>(callback => {
      runtime.dispatch(() => callback(undefined));
      // tslint:disable-next-line
      return () => {};
    })
  )
);

/**
 * Introduce a synchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<E, A>(
  io: Effect<NoEnv, E, A>
): Effect<NoEnv, E, A> {
  return applySecond(shifted as Effect<NoEnv, E, void>, io);
}

/**
 * Introduce a synchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<E, A>(io: Effect<NoEnv, E, A>): Effect<NoEnv, E, A> {
  return applyFirst(io, shifted as Effect<NoEnv, E, void>);
}

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Effect<NoEnv, NoErr, void> = uninterruptible(
  chain_(accessRuntime, runtime =>
    asyncTotal<void>(callback => {
      return runtime.dispatchLater(() => callback(undefined), 0);
    })
  )
);

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<R, E, A>(
  io: Effect<R, E, A>
): Effect<R, E, A> {
  return applySecond(shiftedAsync, io);
}

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return applyFirst(io, shiftedAsync);
}

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Effect<NoEnv, NoErr, never> = asyncTotal(() => {
  // tslint:disable-next-line:no-empty
  const handle = setInterval(() => {}, 60000);
  return () => {
    clearInterval(handle);
  };
});

/**
 * Delay evaluation of inner by some amount of time
 * @param inner
 * @param ms
 */
export function delay<R, E, A>(
  inner: Effect<R, E, A>,
  ms: number
): Effect<R, E, A> {
  return applySecond(after(ms), inner);
}

/**
 * Curried form of delay
 */
export function liftDelay(
  ms: number
): <R, E, A>(io: Effect<R, E, A>) => Effect<R, E, A> {
  return io => delay(io, ms);
}

export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: Option<string>;
  /**
   * Send an interrupt signal to this fiber.
   *
   * The this will complete execution once the target fiber has halted.
   * Does nothing if the target fiber is already complete
   */
  readonly interrupt: Effect<NoEnv, NoErr, void>;
  /**
   * Await the result of this fiber
   */
  readonly wait: Effect<NoEnv, NoErr, Exit<E, A>>;
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: Effect<NoEnv, E, A>;
  /**
   * Poll for a fiber result
   */
  readonly result: Effect<NoEnv, E, Option<A>>;
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Effect<NoEnv, NoErr, boolean>;
}

function createFiber<E, A>(driver: Driver<E, A>, n?: string): Fiber<E, A> {
  const name = option.fromNullable(n);
  const sendInterrupt = sync(() => {
    driver.interrupt();
  });
  const wait = asyncTotal(driver.onExit);
  const interrupt = applySecond(sendInterrupt, asUnit(wait));
  const join = chain_(wait, exit => completed(exit));
  const result = chain_(
    sync(() => driver.exit()),
    opt =>
      pipe(
        opt,
        option.fold(
          () => pure(none),
          (exit: Exit<E, A>) => map_(completed(exit), some)
        )
      )
  );
  const isComplete = sync(() => option.isSome(driver.exit()));
  return {
    name,
    wait,
    interrupt,
    join,
    result,
    isComplete
  };
}

/**
 * Implementation of Stack/waver fork. Creates an IO that will fork a fiber in the background
 * @param init
 * @param name
 */
export function makeFiber<R, E, A>(
  init: Effect<R, E, A>,
  name?: string
): Effect<R, NoErr, Fiber<E, A>> {
  return accessM((r: R) =>
    chain_(accessRuntime, runtime =>
      sync(() => {
        const driver = makeDriver<E, A>(runtime);
        const fiber = createFiber(driver, name);
        driver.start(provideAll(r)(init));
        return fiber;
      })
    )
  );
}

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function fork<R, E, A>(
  io: Effect<R, E, A>,
  name?: string
): Effect<R, NoErr, Fiber<E, A>> {
  return makeFiber(io, name);
}

function completeLatched<E1, E2, E3, A, B, C, R>(
  latch: Ref<boolean>,
  channel: Deferred<R, E3, C>,
  combine: FunctionN<[Exit<E1, A>, Fiber<E2, B>], Effect<R, E3, C>>,
  other: Fiber<E2, B>
): FunctionN<[Exit<E1, A>], Effect<R, NoErr, void>> {
  return exit => {
    const act: Effect<
      NoEnv,
      never,
      Effect<R, NoErr, void>
    > = latch.modify(flag =>
      !flag
        ? ([channel.from(combine(exit, other)), true] as const)
        : ([unit, flag] as const)
    );
    return flatten(act);
  };
}

/**
 * Race two fibers together and combine their results.
 *
 * This is the primitive from which all other racing and timeout operators are built and you should favor those unless you have very specific needs.
 * @param first
 * @param second
 * @param onFirstWon
 * @param onSecondWon
 */
export function raceFold<R, R2, R3, R4, E1, E2, E3, A, B, C>(
  first: Effect<R, E1, A>,
  second: Effect<R2, E2, B>,
  onFirstWon: FunctionN<[Exit<E1, A>, Fiber<E2, B>], Effect<R3, E3, C>>,
  onSecondWon: FunctionN<[Exit<E2, B>, Fiber<E1, A>], Effect<R4, E3, C>>
): Effect<R & R2 & R3 & R4, E3, C> {
  return accessM((r: R & R2) =>
    uninterruptibleMask<R3 & R4, E3, C>(cutout =>
      chain_<NoEnv, E3, Ref<boolean>, R3 & R4, E3, C>(
        makeRef<boolean>(false),
        latch =>
          chain_<R3 & R4, E3, Deferred<R3 & R4, E3, C>, R3 & R4, E3, C>(
            makeDeferred<R3 & R4, E3, C>(),
            channel =>
              chain_(fork(provideAll(r)(first)), fiber1 =>
                chain_(fork(provideAll(r)(second)), fiber2 =>
                  chain_(
                    fork(
                      chain_(
                        fiber1.wait as Effect<NoEnv, NoErr, Exit<E1, A>>,
                        completeLatched(latch, channel, onFirstWon, fiber2)
                      )
                    ),
                    () =>
                      chain_(
                        fork(
                          chain_(
                            fiber2.wait as Effect<NoEnv, NoErr, Exit<E2, B>>,
                            completeLatched(latch, channel, onSecondWon, fiber1)
                          )
                        ),
                        () =>
                          onInterrupted(
                            cutout(channel.wait),
                            applySecond(
                              fiber1.interrupt,
                              fiber2.interrupt
                            ) as Effect<NoEnv, NoErr, void>
                          )
                      )
                  )
                )
              )
          )
      )
    )
  );
}

/**
 * Execute an IO and produce the next IO to run based on whether it completed successfully in the alotted time or not
 * @param source
 * @param ms
 * @param onTimeout
 * @param onCompleted
 */
export function timeoutFold<R, E1, E2, A, B>(
  source: Effect<R, E1, A>,
  ms: number,
  onTimeout: FunctionN<[Fiber<E1, A>], Effect<NoEnv, E2, B>>,
  onCompleted: FunctionN<[Exit<E1, A>], Effect<NoEnv, E2, B>>
): Effect<R, E2, B> {
  return raceFold(
    source,
    after(ms),
    (exit, delayFiber) =>
      applySecond(
        delayFiber.interrupt as Effect<NoEnv, NoErr, void>,
        onCompleted(exit)
      ),
    (_, fiber) => onTimeout(fiber)
  );
}

function interruptLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): Effect<R, E, A> {
  return applySecond(loser.interrupt, completed(exit));
}

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export function raceFirst<R, R2, E, A>(
  io1: Effect<R, E, A>,
  io2: Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser);
}

function fallbackToLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): Effect<R, E, A> {
  return exit._tag === ex.ExitTag.Done
    ? applySecond(loser.interrupt, completed(exit))
    : loser.join;
}

/**
 * Return the result of the first IO to complete successfully.
 *
 * If an error occurs, fall back to the other IO.
 * If both error, then fail with the second errors
 * @param io1
 * @param io2
 */
export function race<R, R2, E, A>(
  io1: Effect<R, E, A>,
  io2: Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser);
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<R, R2, E, E2, A, B, C>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith(aFiber.join, completed(bExit), f)
  );
}

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export function parZip<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2);
}

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export function parApplyFirst<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, A> {
  return parZipWith(ioa, iob, fst);
}

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export function parApplySecond<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, B> {
  return parZipWith(ioa, iob, snd);
}

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iof: Effect<R2, E, FunctionN<[A], B>>
): Effect<R & R2, E, B> {
  return parZipWith(ioa, iof, (a, f) => f(a));
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<R, R2, E, E2, A, B>(
  iof: Effect<R, E, FunctionN<[A], B>>,
  ioa: Effect<R2, E2, A>
): Effect<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<R, E, A>(io: Effect<R, E, A>): Effect<R, NoErr, A> {
  return chainError_(io, e => raiseAbort(e));
}

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export function timeoutOption<R, E, A>(
  source: Effect<R, E, A>,
  ms: number
): Effect<R, E, Option<A>> {
  return timeoutFold(
    source,
    ms,
    actionFiber => applySecond(actionFiber.interrupt, pure(none)),
    exit => map_(completed(exit), some)
  );
}

/**
 * Create an IO from a Promise factory.
 * @param thunk
 */
export function fromPromise<A>(
  thunk: Lazy<Promise<A>>
): Effect<NoEnv, unknown, A> {
  return uninterruptible(
    async<unknown, A>(callback => {
      thunk()
        .then(v => callback(right(v)))
        .catch(e => callback(left(e)));
      // tslint:disable-next-line
      return () => {};
    })
  );
}

export function fromPromiseMap<E>(
  onError: (e: unknown) => E
): <A>(thunk: Lazy<Promise<A>>) => Effect<NoEnv, E, A> {
  return <A>(thunk: Lazy<Promise<A>>) =>
    uninterruptible(
      async<E, A>(callback => {
        thunk()
          .then(v => callback(right(v)))
          .catch(e => callback(left(onError(e))));
        // tslint:disable-next-line
        return () => {};
      })
    );
}

/**
 * Run the given IO with the provided environment.
 * @param io
 * @param r
 * @param callback
 */
export function run<E, A>(
  io: Effect<NoEnv, E, A>,
  callback?: FunctionN<[Exit<E, A>], void>
): Lazy<void> {
  const driver = makeDriver<E, A>();
  if (callback) {
    driver.onExit(callback);
  }
  driver.start(io);
  return driver.interrupt;
}

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromise<E, A>(io: Effect<NoEnv, E, A>): Promise<A> {
  return new Promise((resolve, reject) =>
    run(io, exit => {
      if (exit._tag === ex.ExitTag.Done) {
        resolve(exit.value);
      } else if (exit._tag === ex.ExitTag.Abort) {
        reject(exit.abortedWith);
      } else if (exit._tag === ex.ExitTag.Raise) {
        reject(exit.error);
      } else if (exit._tag === ex.ExitTag.Interrupt) {
        reject();
      }
    })
  );
}

/**
 * Run an IO returning a promise of an Exit.
 *
 * The Promise will not reject.
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromiseExit<E, A>(
  io: Effect<NoEnv, E, A>
): Promise<Exit<E, A>> {
  return new Promise(result => run(io, result));
}

export const URI = "matechs/Effect";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Effect<R, E, A>;
  }
}

function chainError_<R, E1, R2, E2, A>(
  io: Effect<R, E1, A>,
  f: FunctionN<[E1], Effect<R2, E2, A>>
): Effect<R & R2, E2, A> {
  return foldExit_(
    io,
    cause =>
      cause._tag === ex.ExitTag.Raise ? f(cause.error) : completed(cause),
    pure
  );
}

export interface EffectMonad
  extends Monad3E<URI>,
    Bifunctor3<URI>,
    MonadThrow3E<URI> {
  /**
   * Produce an new IO that will use the error produced by inner to produce a recovery program
   * @param io
   * @param f
   */
  chainError<R, E1, R2, E2, A>(
    io: Effect<R, E1, A>,
    f: FunctionN<[E1], Effect<R2, E2, A>>
  ): Effect<R & R2, E2, A>;

  /**
   * Fold the result of an IO into a new IO.
   *
   * This can be thought of as a more powerful form of chain
   * where the computation continues with a new IO depending on the result of inner.
   * @param inner The IO to fold the exit of
   * @param failure
   * @param success
   */
  foldExit<R, E1, R2, E2, A1, A2, R3, E3>(
    inner: Effect<R, E1, A1>,
    failure: FunctionN<[Cause<E1>], Effect<R2, E2, A2>>,
    success: FunctionN<[A1], Effect<R3, E3, A2>>
  ): Effect<R & R2 & R3, E2 | E3, A2>;

  /**
   * Sequence a Stack and then produce an effect based on the produced value for observation.
   *
   * Produces the result of the iniital Stack
   * @param inner
   * @param bind
   */
  chainTap<R, E, A, R2, E2>(
    inner: Effect<R, E, A>,
    bind: FunctionN<[A], Effect<R2, E2, unknown>>
  ): Effect<R & R2, E | E2, A>;

  /**
   * Map over either the error or value produced by an IO
   * @param io
   * @param leftMap
   * @param rightMap
   */
  bimap<R, E1, E2, A, B>(
    io: Effect<R, E1, A>,
    leftMap: FunctionN<[E1], E2>,
    rightMap: FunctionN<[A], B>
  ): Effect<R, E2, B>;

  /**
   * Map the error produced by an IO
   * @param io
   * @param f
   */
  mapError: EffectMonad["mapLeft"];
}

const foldExit_: EffectMonad["foldExit"] = (inner, failure, success) => r => ({
  _tag: EffectTag.Collapse,
  inner: provideAll(r)(inner),
  failure: c => provideAll(r)(failure(c)),
  success: a => provideAll(r)(success(a))
});

const mapLeft_: EffectMonad["mapLeft"] = (io, f) =>
  chainError_(io, flow(f, raiseError));

export const effect: EffectMonad = {
  URI,
  map: map_,
  of: pure,
  ap: ap_,
  chain: chain_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  mapError: mapLeft_,
  throwError: raiseError,
  chainError: chainError_,
  foldExit: foldExit_,
  chainTap: chainTap_
};

export const parEffect: Monad3E<URI> & Bifunctor3<URI> & MonadThrow3E<URI> = {
  URI,
  map: map_,
  of: pure,
  ap: parAp_,
  chain: chain_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  throwError: raiseError
};

const {
  ap,
  apFirst,
  apSecond,
  // toto
  bimap,
  chain,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromOption,
  fromPredicate,
  map,
  mapLeft
} = pipeable(effect);

export {
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromOption,
  fromPredicate,
  map,
  mapLeft
};

export function getSemigroup<R, E, A>(
  s: Semigroup<A>
): Semigroup<Effect<R, E, A>> {
  return {
    concat(x: Effect<R, E, A>, y: Effect<R, E, A>): Effect<R, E, A> {
      return zipWith(x, y, s.concat);
    }
  };
}

export function getMonoid<R, E, A>(m: Monoid<A>): Monoid<Effect<R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  };
}

/* conditionals */

export function when(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => Effect<R, E, Op.Option<A>> {
  return ma => (predicate ? map_(ma, Op.some) : pure(Op.none));
}

export function or_(
  predicate: boolean
): <R, E, A>(
  ma: Effect<R, E, A>
) => <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return ma => mb => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function or<R, E, A>(
  ma: Effect<R, E, A>
): <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => (predicate: boolean) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return mb => predicate =>
    predicate ? map_(ma, Ei.left) : map_(mb, Ei.right);
}

export function alt_(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => (mb: Effect<R, E, A>) => Effect<R, E, A> {
  return ma => mb => (predicate ? ma : mb);
}

export function alt<R, E, A>(
  ma: Effect<R, E, A>
): (mb: Effect<R, E, A>) => (predicate: boolean) => Effect<R, E, A> {
  return mb => predicate => (predicate ? ma : mb);
}

export function fromNullableM<R, E, A>(
  ma: Effect<R, E, A>
): Effect<R, E, Option<A>> {
  return map_(ma, Op.fromNullable);
}

export function sequenceP(
  n: number
): <R, E, A>(ops: Array<Effect<R, E, A>>) => Effect<R, E, Array<A>> {
  return ops =>
    Do(effect)
      .bind("sem", S.makeSemaphore(n))
      .bindL("r", ({ sem }) =>
        Ar.array.traverse(parEffect)(ops, op => sem.withPermit(op))
      )
      .return(s => s.r);
}

export function getCauseSemigroup<E>(S: Semigroup<E>): Semigroup<Cause<E>> {
  return {
    concat: (ca, cb): Cause<E> => {
      if (
        ca._tag === ex.ExitTag.Interrupt ||
        cb._tag === ex.ExitTag.Interrupt
      ) {
        return ca;
      }
      if (ca._tag === ex.ExitTag.Abort) {
        return ca;
      }
      if (cb._tag === ex.ExitTag.Abort) {
        return cb;
      }
      return ex.raise(S.concat(ca.error, cb.error));
    }
  };
}

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S));
}

export function getCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad3EC<URI, E> & MonadThrow3EC<URI, E> & Alt3EC<URI, E> {
  return {
    URI,
    // @ts-ignore
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <R, R2, A, B>(
      fab: Effect<R, E, (a: A) => B>,
      fa: Effect<R2, E, A>
    ): Effect<R & R2, E, B> =>
      foldExit_(
        fab,
        fabe =>
          foldExit_(
            fa,
            fae => raised(S.concat(fabe, fae)),
            _ => raised(fabe)
          ),
        f => map_(fa, f)
      ),
    throwError: <R, A>(e: E): Effect<R, E, A> => raiseError(e),
    alt: <R, R2, A>(
      fa: Effect<R, E, A>,
      fb: () => Effect<R2, E, A>
    ): Effect<R & R2, E, A> =>
      foldExit_(
        fa,
        e => foldExit_(fb(), fbe => raised(S.concat(e, fbe)), pure),
        pure
      )
  };
}
