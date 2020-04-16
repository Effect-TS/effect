import {
  array as Ar,
  bifunctor as Bif,
  either as Ei,
  function as F,
  functor as Fun,
  monoid as Mon,
  option as Op,
  pipeable as P,
  semigroup as Sem,
  tree as TR
} from "fp-ts";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Separated } from "fp-ts/lib/Compactable";
import { pipe } from "fp-ts/lib/pipeable";
import { DriverSyncImpl } from "./driverSync";
import * as T from "./effect";
import * as ex from "./original/exit";
import { Runtime } from "./original/runtime";
import { fst, snd, tuple2 } from "./original/support/util";
import { Alt3E, Alt3EC, Monad3E, Monad3EC, MonadThrow3E, MonadThrow3EC } from "./overload";

export type NoEnv = unknown;
export type NoErr = never;

export const noEnv: {} = {};

/**
 * A description of an effect to perform
 */
export interface SyncEffect<R, E, A> {
  _tag: T.EffectTag;

  _TAG: () => "Effect";
  _E: () => E;
  _A: () => A;
  _R: (_: R) => void;

  _F: () => "Sync";
}

export interface UIO<A> extends SyncEffect<unknown, never, A> {}
export interface EIO<E, A> extends SyncEffect<unknown, E, A> {}
export interface RIO<R, A> extends SyncEffect<R, never, A> {}

export class Implementation<R, E, A> implements SyncEffect<R, E, A> {
  static fromSyncEffect<R, E, A>(eff: SyncEffect<R, E, A>): Implementation<R, E, A> {
    return eff as any;
  }

  constructor(
    readonly _tag: T.EffectTag,
    readonly f0: any = undefined,
    readonly f1: any = undefined,
    readonly f2: any = undefined
  ) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _F(): "Sync" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): E {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }
}

/**
 * An IO has succeeded
 * @param a the value
 */
export function pure<A>(a: A): SyncEffect<NoEnv, NoErr, A> {
  return new Implementation(T.EffectTag.Pure, a);
}

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: ex.Cause<E>): SyncEffect<NoEnv, E, A> {
  return new Implementation(T.EffectTag.Raised, e);
}

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E, A = never>(e: E): SyncEffect<NoEnv, E, A> {
  return raised(ex.raise(e));
}

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): SyncEffect<NoEnv, NoErr, never> {
  return raised(ex.abort(u));
}

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: SyncEffect<NoEnv, NoErr, never> = raised(ex.interrupt);

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E, A>(exit: ex.Exit<E, A>): SyncEffect<NoEnv, E, A> {
  return new Implementation(T.EffectTag.Completed, exit);
}

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export function suspended<R, E, A>(thunk: F.Lazy<SyncEffect<R, E, A>>): SyncEffect<R, E, A> {
  return new Implementation(T.EffectTag.Suspended, thunk);
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export function sync<E = NoErr, A = unknown>(thunk: F.Lazy<A>): SyncEffect<NoEnv, E, A> {
  return suspended(() => pure(thunk()));
}

export function trySync<E = unknown, A = unknown>(thunk: F.Lazy<A>): SyncEffect<NoEnv, E, A> {
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
): <A = unknown>(thunk: F.Lazy<A>) => SyncEffect<NoEnv, E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk());
      } catch (e) {
        return raiseError(onError(e));
      }
    });
}

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<R, E, A>(
  inner: SyncEffect<R, E, A>,
  flag: boolean
): SyncEffect<R, E, A> {
  return new Implementation(T.EffectTag.InterruptibleRegion, flag, inner);
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
function chain_<R, E, A, R2, E2, B>(
  inner: SyncEffect<R, E, A>,
  bind: F.FunctionN<[A], SyncEffect<R2, E2, B>>
): SyncEffect<R & R2, E | E2, B> {
  return inner._tag === T.EffectTag.Pure
    ? bind((inner as any).f0)
    : new Implementation(T.EffectTag.Chain, inner, bind);
}

export function chainOption<E>(
  onEmpty: F.Lazy<E>
): <A, B>(
  bind: F.FunctionN<[A], Op.Option<B>>
) => <R, E2>(eff: SyncEffect<R, E2, A>) => SyncEffect<R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty));
}

export function chainEither<A, E, B>(
  bind: F.FunctionN<[A], Ei.Either<E, B>>
): <R, E2>(eff: SyncEffect<R, E2, A>) => SyncEffect<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)));
}

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Ei.Either<E, A>): SyncEffect<NoEnv, E, A> {
  return new Implementation(T.EffectTag.PureEither, e);
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: Op.Option<A>, onError: F.Lazy<E>): SyncEffect<NoEnv, E, A> {
  return new Implementation(T.EffectTag.PureOption, o, onError);
}

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export function foldExit<E1, RF, E2, A1, E3, A2, RS>(
  failure: F.FunctionN<[ex.Cause<E1>], SyncEffect<RF, E2, A2>>,
  success: F.FunctionN<[A1], SyncEffect<RS, E3, A2>>
): <R>(io: SyncEffect<R, E1, A1>) => SyncEffect<RF & RS & R, E2 | E3, A2> {
  return (io) => foldExit_(io, failure, success);
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: SyncEffect<NoEnv, NoErr, boolean> = new Implementation(
  T.EffectTag.AccessInterruptible,
  F.identity
);

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: SyncEffect<NoEnv, NoErr, Runtime> = new Implementation(
  T.EffectTag.AccessRuntime,
  F.identity
);

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */
export function withRuntime<E, A>(
  f: F.FunctionN<[Runtime], SyncEffect<NoEnv, E, A>>
): SyncEffect<NoEnv, E, A> {
  return chain_(accessRuntime as SyncEffect<NoEnv, E, Runtime>, f);
}

export function accessEnvironment<R>(): SyncEffect<R, NoErr, R> {
  return new Implementation(T.EffectTag.AccessEnv);
}

export function accessM<R, R2, E, A>(
  f: F.FunctionN<[R], SyncEffect<R2, E, A>>
): SyncEffect<R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f);
}

export function access<R, A, E = NoErr>(f: F.FunctionN<[R], A>): SyncEffect<R, E, A> {
  return map_(accessEnvironment<R>(), f);
}

/**
 * Provides partial environment via the spread operator, providing several environment is possible via:
 * pipe(eff, provide(env1), provide(env2)) or pipe(eff, provide<Env1 & Env2>({...env1, ...env2}))
 *
 * the second parameter is used to invert the priority of newly provided environment
 * and should be used when you want subsequent providers to take precedence (i.e. having currently provided env as default)
 */
export function provide<R>(
  r: R,
  inverted: "regular" | "inverted" = "regular"
): Provider<unknown, R, never> {
  return <R2, E, A>(eff: SyncEffect<R2 & R, E, A>): SyncEffect<R2, E, A> =>
    provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(eff);
}

/**
 * Like provide where environment is resolved monadically
 */
export function provideM<R, R3, E2>(
  rm: SyncEffect<R3, E2, R>,
  inverted: "regular" | "inverted" = "regular"
): Provider<R3, R, E2> {
  return <R2, E, A>(eff: SyncEffect<R2 & R, E, A>): SyncEffect<R2 & R3, E | E2, A> =>
    chain_(rm, (r) =>
      provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(eff)
    );
}

const provideR = <R2, R>(f: (r2: R2) => R) => <E, A>(
  ma: SyncEffect<R, E, A>
): SyncEffect<R2, E, A> =>
  accessM((r2: R2) => new Implementation(T.EffectTag.ProvideEnv, ma, f(r2)));

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
function map_<R, E, A, B>(base: SyncEffect<R, E, A>, f: F.FunctionN<[A], B>): SyncEffect<R, E, B> {
  return base._tag === T.EffectTag.Pure
    ? new Implementation(T.EffectTag.Pure, f((base as any).f0))
    : new Implementation(T.EffectTag.Map, base, f);
}

/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(
  f: F.FunctionN<[A], B>
): <R, E>(io: SyncEffect<R, E, A>) => SyncEffect<R, E, B> {
  return <R, E>(io: SyncEffect<R, E, A>) => map_(io, f);
}

export function liftEither<A, E, B>(
  f: F.FunctionN<[A], Ei.Either<E, B>>
): F.FunctionN<[A], EIO<E, B>> {
  return (a) => suspended(() => fromEither(f(a)));
}

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<R, E, A, B>(io: SyncEffect<R, E, A>, b: B): SyncEffect<R, E, B> {
  return map_(io, F.constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(b: B): <R, E, A>(io: SyncEffect<R, E, A>) => SyncEffect<R, E, B> {
  return (io) => as(io, b);
}

export function chainTap<R, E, A>(
  bind: F.FunctionN<[A], SyncEffect<R, E, unknown>>
): <R2, E2>(inner: SyncEffect<R2, E2, A>) => SyncEffect<R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind);
}

const chainTap_ = <R, E, A, R2, E2>(
  inner: SyncEffect<R, E, A>,
  bind: F.FunctionN<[A], SyncEffect<R2, E2, unknown>>
): SyncEffect<R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a));

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, E, void> {
  return as(io, undefined);
}

/**
 * An IO that succeeds immediately with void
 */
export const unit: SyncEffect<NoEnv, NoErr, void> = pure(undefined);

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<R, E1, E2, A>(
  f: F.FunctionN<[E1], SyncEffect<R, E2, A>>
): <A2, R2>(rio: SyncEffect<R2, E1, A2>) => SyncEffect<R & R2, E2, A | A2> {
  return (io) => chainError_(io, f);
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: F.FunctionN<[E1], E2>
): <R, A>(io: SyncEffect<R, E1, A>) => SyncEffect<R, E2, A> {
  return <R, A>(io: SyncEffect<R, E1, A>) => mapLeft_(io, f);
}

function bimap_<R, E1, E2, A, B>(
  io: SyncEffect<R, E1, A>,
  leftMap: F.FunctionN<[E1], E2>,
  rightMap: F.FunctionN<[A], B>
): SyncEffect<R, E2, B> {
  return foldExit_(
    io,
    (cause) => (cause._tag === "Raise" ? raiseError(leftMap(cause.error)) : completed(cause)),
    F.flow(rightMap, pure)
  );
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
function zipWith_<R, E, A, R2, E2, B, C>(
  first: SyncEffect<R, E, A>,
  second: SyncEffect<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): SyncEffect<R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)));
}

export function zipWith<A, R2, E2, B, C>(
  second: SyncEffect<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): <R, E>(first: SyncEffect<R, E, A>) => SyncEffect<R & R2, E | E2, C> {
  return (first) => zipWith_(first, second, f);
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
function zip_<R, E, A, R2, E2, B>(
  first: SyncEffect<R, E, A>,
  second: SyncEffect<R2, E2, B>
): SyncEffect<R & R2, E | E2, readonly [A, B]> {
  return zipWith_(first, second, tuple2);
}

export function zip<R2, E2, B>(
  second: SyncEffect<R2, E2, B>
): <R, E, A>(first: SyncEffect<R, E, A>) => SyncEffect<R & R2, E | E2, readonly [A, B]> {
  return (first) => zip_(first, second);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<R, E, A, R2, E2, B>(
  first: SyncEffect<R, E, A>,
  second: SyncEffect<R2, E2, B>
): SyncEffect<R & R2, E | E2, A> {
  return zipWith_(first, second, fst);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<R, E, A, R2, E2, B>(
  first: SyncEffect<R, E, A>,
  second: SyncEffect<R2, E2, B>
): SyncEffect<R & R2, E | E2, B> {
  return zipWith_(first, second, snd);
}

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<R, E, A, R2, E2, B>(
  first: SyncEffect<R, E, A>,
  second: F.Lazy<SyncEffect<R2, E2, B>>
): SyncEffect<R & R2, E | E2, B> {
  return chain_(first, second);
}

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<R, E, A, R2, E2, B>(
  ioa: SyncEffect<R, E, A>,
  iof: SyncEffect<R2, E2, F.FunctionN<[A], B>>
): SyncEffect<R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith_(ioa, iof, (a, f) => f(a));
}

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
function ap_<R, E, A, B, R2, E2>(
  iof: SyncEffect<R, E, F.FunctionN<[A], B>>,
  ioa: SyncEffect<R2, E2, A>
): SyncEffect<R & R2, E | E2, B> {
  return zipWith_(iof, ioa, (f, a) => f(a));
}

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, A, E> {
  return foldExit_(
    io,
    (error) => (error._tag === "Raise" ? pure(error.error) : completed(error)),
    raiseError
  );
}

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, E, never> {
  return chain_(io, () => forever(io));
}

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, NoErr, ex.Exit<E, A>> {
  return foldExit_(
    io,
    (c) => pure(c) as SyncEffect<R, NoErr, ex.Exit<E, A>>,
    (d) => pure(ex.done(d))
  );
}

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, E, A> {
  return interruptibleRegion(io, true);
}

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, E, A> {
  return interruptibleRegion(io, false);
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<R, E, A> = F.FunctionN<[SyncEffect<R, E, A>], SyncEffect<R, E, A>>;

function makeInterruptMaskCutout<R, E, A>(state: boolean): InterruptMaskCutout<R, E, A> {
  return (inner: SyncEffect<R, E, A>) => interruptibleRegion(inner, state);
}

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], SyncEffect<R, E, A>>
): SyncEffect<R, E, A> {
  return chain_(accessInterruptible, (flag) => {
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
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], SyncEffect<R, E, A>>
): SyncEffect<R, E, A> {
  return chain_(accessInterruptible, (flag) => interruptible(f(makeInterruptMaskCutout(flag))));
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
  acquire: SyncEffect<R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], SyncEffect<R2, E2, unknown>>,
  use: F.FunctionN<[A], SyncEffect<R3, E3, B>>
): SyncEffect<R & R2 & R3, E | E2 | E3, B> {
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

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export function bracket<R, E, A, R2, E2, R3, E3, B>(
  acquire: SyncEffect<R, E, A>,
  release: F.FunctionN<[A], SyncEffect<R2, E2, unknown>>,
  use: F.FunctionN<[A], SyncEffect<R3, E3, B>>
): SyncEffect<R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use);
}

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
function onComplete_<R, E, A, R2, E2>(
  ioa: SyncEffect<R, E, A>,
  finalizer: SyncEffect<R2, E2, unknown>
): SyncEffect<R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
    )
  );
}

export function onComplete<R2, E2>(finalizer: SyncEffect<R2, E2, unknown>) {
  return <R, E, A>(ioa: SyncEffect<R, E, A>) => onComplete_(ioa, finalizer);
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
function onInterrupted_<R, E, A, R2, E2>(
  ioa: SyncEffect<R, E, A>,
  finalizer: SyncEffect<R2, E2, unknown>
): SyncEffect<R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
        : completed(exit)
    )
  );
}

export function onInterrupted<R2, E2>(finalizer: SyncEffect<R2, E2, unknown>) {
  return <R, E, A>(ioa: SyncEffect<R, E, A>) => onInterrupted_(ioa, finalizer);
}

export function combineInterruptExit<R, E, A, R2, E2>(
  ioa: SyncEffect<R, E, A>,
  finalizer: SyncEffect<R2, E2, ex.Interrupt[]>
): SyncEffect<R & R2, E | E2, A> {
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
                ? completed(ex.interruptWithErrorAndOthers(errors[0], Ar.dropLeft(1)(errors)))
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
/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<R, E, A>(io: SyncEffect<R, E, A>): SyncEffect<R, NoErr, A> {
  return chainError_(io, raiseAbort);
}

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export function runSync<E, A>(io: SyncEffect<{}, E, A>): ex.Exit<E, A> {
  return pipe(
    new DriverSyncImpl<E, A>().start(io),
    Ei.fold(
      (e) => {
        throw e;
      },
      (e) => e
    )
  );
}

/* istanbul skip next */
export function runUnsafeSync<E, A>(io: SyncEffect<{}, E, A>): A {
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

export const URI = "matechs/SyncEffect";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: SyncEffect<R, E, A>;
  }
}

function chainError_<R, E1, R2, E2, A, A2>(
  io: SyncEffect<R, E1, A>,
  f: F.FunctionN<[E1], SyncEffect<R2, E2, A2>>
): SyncEffect<R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) => (cause._tag === "Raise" ? f(cause.error) : completed(cause)),
    pure
  );
}

export interface SyncEffectMonad
  extends Monad3E<URI>,
    Bif.Bifunctor3<URI>,
    MonadThrow3E<URI>,
    Alt3E<URI>,
    Fun.Functor3<URI> {
  /**
   * Produce an new IO that will use the error produced by inner to produce a recovery program
   * @param io
   * @param f
   */
  chainError<R, E1, R2, E2, A, A2>(
    io: SyncEffect<R, E1, A>,
    f: F.FunctionN<[E1], SyncEffect<R2, E2, A2>>
  ): SyncEffect<R & R2, E2, A | A2>;

  /**
   * Fold the result of an IO into a new IO.
   *
   * This can be thought of as a more powerful form of chain
   * where the computation continues with a new IO depending on the result of inner.
   * @param inner The IO to fold the exit of
   * @param failure
   * @param success
   */
  foldExit<R, E1, R2, E2, A1, A2, A3, R3, E3>(
    inner: SyncEffect<R, E1, A1>,
    failure: F.FunctionN<[ex.Cause<E1>], SyncEffect<R2, E2, A2>>,
    success: F.FunctionN<[A1], SyncEffect<R3, E3, A3>>
  ): SyncEffect<R & R2 & R3, E2 | E3, A2 | A3>;

  /**
   * Sequence a Stack and then produce an effect based on the produced value for observation.
   *
   * Produces the result of the iniital Stack
   * @param inner
   * @param bind
   */
  chainTap<R, E, A, R2, E2>(
    inner: SyncEffect<R, E, A>,
    bind: F.FunctionN<[A], SyncEffect<R2, E2, unknown>>
  ): SyncEffect<R & R2, E | E2, A>;

  /**
   * Map over either the error or value produced by an IO
   * @param io
   * @param leftMap
   * @param rightMap
   */
  bimap<R, E1, E2, A, B>(
    io: SyncEffect<R, E1, A>,
    leftMap: F.FunctionN<[E1], E2>,
    rightMap: F.FunctionN<[A], B>
  ): SyncEffect<R, E2, B>;

  /**
   * Map the error produced by an IO
   * @param io
   * @param f
   */
  mapError: SyncEffectMonad["mapLeft"];

  onInterrupted<R, E, A, R2, E2>(
    ioa: SyncEffect<R, E, A>,
    finalizer: SyncEffect<R2, E2, unknown>
  ): SyncEffect<R & R2, E | E2, A>;

  onComplete<R, E, A, R2, E2>(
    ioa: SyncEffect<R, E, A>,
    finalizer: SyncEffect<R2, E2, unknown>
  ): SyncEffect<R & R2, E | E2, A>;

  zip<R, E, A, R2, E2, B>(
    first: SyncEffect<R, E, A>,
    second: SyncEffect<R2, E2, B>
  ): SyncEffect<R & R2, E | E2, readonly [A, B]>;

  zipWith<R, E, A, R2, E2, B, C>(
    first: SyncEffect<R, E, A>,
    second: SyncEffect<R2, E2, B>,
    f: F.FunctionN<[A, B], C>
  ): SyncEffect<R & R2, E | E2, C>;
}

const foldExit_: SyncEffectMonad["foldExit"] = (inner, failure, success) =>
  new Implementation(T.EffectTag.Collapse, inner, failure, success);

const mapLeft_: SyncEffectMonad["mapLeft"] = (io, f) => chainError_(io, F.flow(f, raiseError));

const alt_: SyncEffectMonad["alt"] = chainError_;

export function alt<R2, E2, A>(
  fy: () => SyncEffect<R2, E2, A>
): <R, E>(fx: SyncEffect<R, E, A>) => SyncEffect<R & R2, E2, A> {
  return (fx) => alt_(fx, fy);
}

export const effect: SyncEffectMonad = {
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
  chainTap: chainTap_,
  alt: alt_,
  onInterrupted: onInterrupted_,
  onComplete: onComplete_,
  zip: zip_,
  zipWith: zipWith_
};

export const Do = DoG(effect);
export const sequenceS = SS(effect);
export const sequenceT = ST(effect);

const {
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
} = P.pipeable(effect);

export { Erase } from "./erase";
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

export function getSemigroup<R, E, A>(s: Sem.Semigroup<A>): Sem.Semigroup<SyncEffect<R, E, A>> {
  return {
    concat(x: SyncEffect<R, E, A>, y: SyncEffect<R, E, A>): SyncEffect<R, E, A> {
      return zipWith_(x, y, s.concat);
    }
  };
}

export function getMonoid<R, E, A>(m: Mon.Monoid<A>): Mon.Monoid<SyncEffect<R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  };
}

/* conditionals */

export function when(
  predicate: boolean
): <R, E, A>(ma: SyncEffect<R, E, A>) => SyncEffect<R, E, Op.Option<A>> {
  return (ma) => (predicate ? map_(ma, Op.some) : pure(Op.none));
}

export function or_(
  predicate: boolean
): <R, E, A>(
  ma: SyncEffect<R, E, A>
) => <R2, E2, B>(mb: SyncEffect<R2, E2, B>) => SyncEffect<R & R2, E | E2, Ei.Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function or<R, E, A>(
  ma: SyncEffect<R, E, A>
): <R2, E2, B>(
  mb: SyncEffect<R2, E2, B>
) => (predicate: boolean) => SyncEffect<R & R2, E | E2, Ei.Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function condWith(
  predicate: boolean
): <R, E, A>(
  ma: SyncEffect<R, E, A>
) => <R2, E2, B>(mb: SyncEffect<R2, E2, B>) => SyncEffect<R & R2, E | E2, A | B> {
  return (ma) => (mb) => (predicate ? ma : mb);
}

export function cond<R, E, A>(
  ma: SyncEffect<R, E, A>
): <R2, E2, B>(
  mb: SyncEffect<R2, E2, B>
) => (predicate: boolean) => SyncEffect<R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb);
}

export function fromNullableM<R, E, A>(ma: SyncEffect<R, E, A>): SyncEffect<R, E, Op.Option<A>> {
  return map_(ma, Op.fromNullable);
}

export function getCauseSemigroup<E>(S: Sem.Semigroup<E>): Sem.Semigroup<ex.Cause<E>> {
  return {
    concat: (ca, cb): ex.Cause<E> => {
      if (ca._tag === "Interrupt" || cb._tag === "Interrupt") {
        return ca;
      }
      if (ca._tag === "Abort") {
        return ca;
      }
      if (cb._tag === "Abort") {
        return cb;
      }
      return ex.raise(S.concat(ca.error, cb.error));
    }
  };
}

export function getValidationM<E>(S: Sem.Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S));
}

export function getCauseValidationM<E>(
  S: Sem.Semigroup<ex.Cause<E>>
): Monad3EC<URI, E> & MonadThrow3EC<URI, E> & Alt3EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <R, R2, A, B>(
      fab: SyncEffect<R, E, (a: A) => B>,
      fa: SyncEffect<R2, E, A>
    ): SyncEffect<R & R2, E, B> =>
      foldExit_(
        fab,
        (fabe) =>
          foldExit_(
            fa,
            (fae) => raised(S.concat(fabe, fae)),
            (_) => raised(fabe)
          ),
        (f) => map_(fa, f)
      ),
    throwError: raiseError as <R, A>(e: E) => SyncEffect<R, E, A>,
    alt: <R, R2, A>(
      fa: SyncEffect<R, E, A>,
      fb: () => SyncEffect<R2, E, A>
    ): SyncEffect<R & R2, E, A> =>
      foldExit_(fa, (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure), pure)
  };
}

export interface Provider<Environment, Module, E2 = never> {
  <R, E, A>(e: SyncEffect<Module & R, E, A>): SyncEffect<Environment & R, E | E2, A>;
}

export const sequenceOption = Op.option.sequence(effect);

export const traverseOption: <A, R, E, B>(
  f: (a: A) => SyncEffect<R, E, B>
) => (ta: Op.Option<A>) => SyncEffect<R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.traverse(effect)(ta, f);

export const wiltOption: <A, R, E, B, C>(
  f: (a: A) => SyncEffect<R, E, Ei.Either<B, C>>
) => (wa: Op.Option<A>) => SyncEffect<R, E, Separated<Op.Option<B>, Op.Option<C>>> = (f) => (wa) =>
  Op.option.wilt(effect)(wa, f);

export const witherOption: <A, R, E, B>(
  f: (a: A) => SyncEffect<R, E, Op.Option<B>>
) => (ta: Op.Option<A>) => SyncEffect<R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.wither(effect)(ta, f);

export const sequenceEither = Ei.either.sequence(effect);

export const traverseEither: <A, R, FE, B>(
  f: (a: A) => SyncEffect<R, FE, B>
) => <TE>(ta: Ei.Either<TE, A>) => SyncEffect<R, FE, Ei.Either<TE, B>> = (f) => (ta) =>
  Ei.either.traverse(effect)(ta, f);

export const sequenceTree = TR.tree.sequence(effect);

export const traverseTree: <A, R, E, B>(
  f: (a: A) => SyncEffect<R, E, B>
) => (ta: TR.Tree<A>) => SyncEffect<R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effect)(ta, f);

export const sequenceArray = Ar.array.sequence(effect);

export const traverseArray: <A, R, E, B>(
  f: (a: A) => SyncEffect<R, E, B>
) => (ta: Array<A>) => SyncEffect<R, E, Array<B>> = (f) => (ta) => Ar.array.traverse(effect)(ta, f);

export const traverseArrayWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => SyncEffect<R, E, B>
) => (ta: Array<A>) => SyncEffect<R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effect)(ta, f);

export const wiltArray: <A, R, E, B, C>(
  f: (a: A) => SyncEffect<R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => SyncEffect<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(effect)(wa, f);

export const witherArray: <A, R, E, B>(
  f: (a: A) => SyncEffect<R, E, Op.Option<B>>
) => (ta: Array<A>) => SyncEffect<R, E, Array<B>> = (f) => (ta) => Ar.array.wither(effect)(ta, f);
