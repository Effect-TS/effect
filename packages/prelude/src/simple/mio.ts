import { effect as T, exit as ex } from "@matechs/effect";
import { Runtime } from "@matechs/effect/lib/original/runtime";
import * as F from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TA from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import * as TR from "fp-ts/lib/Tree";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";
import { Monad3E, MonadThrow3E, Alt3E, Monad3EC, MonadThrow3EC, Alt3EC } from "./overloads";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Functor3 } from "fp-ts/lib/Functor";
import { pipeable } from "fp-ts/lib/pipeable";
import { Semigroup } from "fp-ts/lib/Semigroup";
import { Monoid } from "fp-ts/lib/Monoid";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Separated } from "fp-ts/lib/Compactable";

export interface MIO<R, E, A> extends T.Effect<unknown, R, E, A> {
  _tag: T.EffectTag;

  _TAG: () => "Effect";
  _E: () => E;
  _A: () => A;
  _R: (_: R) => void;
  _S: () => unknown;
}

export type UIO<A> = MIO<unknown, never, A>;
export type IO<E, A> = MIO<unknown, E, A>;

export const URI = "matechs/prelude/MIO";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: MIO<R, E, A>;
  }
}

/**
 * An IO has succeeded
 * @param a the value
 */
export const pure: <A>(a: A) => UIO<A> = T.pure;

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export const raised: <E, A = never>(e: ex.Cause<E>) => IO<E, A> = T.raised;

/**
 * An IO that is failed with a checked error
 * @param e
 */
export const raiseError: <E, A = never>(e: E) => IO<E, A> = T.raiseError;

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export const raiseAbort: (u: unknown) => UIO<never> = T.raiseAbort;

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: UIO<never> = T.raiseInterrupt;

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export const completed: <E, A>(exit: ex.Exit<E, A>) => IO<E, A> = T.completed;

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export const suspended: <R, E, A>(thunk: F.Lazy<MIO<R, E, A>>) => MIO<R, E, A> = T.suspended;

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export const sync: <A>(thunk: F.Lazy<A>) => UIO<A> = T.sync;

export const trySync: <A = unknown>(thunk: F.Lazy<A>) => IO<unknown, A> = T.trySync;

export const trySyncMap: <E>(
  onError: (e: unknown) => E
) => <A = unknown>(thunk: F.Lazy<A>) => IO<E, A> = T.trySyncMap;

/**
 * Wrap an impure callback in an IO
 *
 * The provided const must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export const async: <E, A>(op: T.AsyncFn<E, A>) => IO<E, A> = T.async;

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export const asyncTotal: <A>(
  op: F.FunctionN<[F.FunctionN<[A], void>], T.AsyncCancelContFn>
) => UIO<A> = T.asyncTotal;

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export const interruptibleRegion: <R, E, A>(inner: MIO<R, E, A>, flag: boolean) => MIO<R, E, A> =
  T.interruptibleRegion;

export const chainOption: <E>(
  onEmpty: F.Lazy<E>
) => <A, B>(
  bind: F.FunctionN<[A], O.Option<B>>
) => <R, E2>(eff: MIO<R, E2, A>) => MIO<R, E | E2, B> = T.chainOption;

export const chainEither: <A, E, B>(
  bind: F.FunctionN<[A], E.Either<E, B>>
) => <R, E2>(eff: MIO<R, E2, A>) => MIO<R, E | E2, B> = T.chainEither;

export const chainTask: <A, B>(
  bind: F.FunctionN<[A], TA.Task<B>>
) => <R, E2>(eff: MIO<R, E2, A>) => MIO<R, E2, B> = T.chainTask;

export const chainTaskEither: <A, E, B>(
  bind: F.FunctionN<[A], TE.TaskEither<E, B>>
) => <R, E2>(eff: MIO<R, E2, A>) => MIO<R, E | E2, B> = T.chainTaskEither;

/**
 * Lift an Either into an IO
 * @param e
 */
export const encaseEither: <E, A>(e: E.Either<E, A>) => IO<E, A> = T.encaseEither;

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export const encaseOption: <E, A>(o: O.Option<A>, onError: F.Lazy<E>) => IO<E, A> = T.encaseOption;

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export const foldExit: <E1, RF, E2, A1, E3, A2, RS>(
  failure: F.FunctionN<[ex.Cause<E1>], MIO<RF, E2, A2>>,
  success: F.FunctionN<[A1], MIO<RS, E3, A2>>
) => <R>(io: MIO<R, E1, A1>) => MIO<RF & RS & R, E2 | E3, A2> = T.foldExit;

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: UIO<boolean> = T.accessInterruptible;

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: UIO<Runtime> = T.accessRuntime;

/**
 * Access the runtime then provide it to the provided const
 * @param f
 */
export const withRuntime: <R, E, A>(f: F.FunctionN<[Runtime], MIO<R, E, A>>) => MIO<R, E, A> =
  T.withRuntime;

export const accessEnvironment: <R>() => MIO<R, never, R> = T.accessEnvironment;

export const accessM: <R, R2, E, A>(f: F.FunctionN<[R], MIO<R2, E, A>>) => MIO<R & R2, E, A> =
  T.accessM;

export const access: <R, A>(f: F.FunctionN<[R], A>) => MIO<R, never, A> = T.access;

/**
 * Provides partial environment via the spread operator, providing several environment is possible via:
 * pipe(eff, provide(env1), provide(env2)) or pipe(eff, provide<Env1 & Env2>({...env1, ...env2}))
 *
 * the second parameter is used to invert the priority of newly provided environment
 * and should be used when you want subsequent providers to take precedence (i.e. having currently provided env as default)
 */
export const provide: <R>(
  r: R,
  inverted?: "regular" | "inverted"
) => T.Provider<unknown, R, never, unknown> = T.provide;

/**
 * Like provide where environment is resolved monadically
 */
export const provideM: <R, R3, E2>(
  rm: MIO<R3, E2, R>,
  inverted?: "regular" | "inverted"
) => T.Provider<R3, R, E2, unknown> = T.provideM;

/**
 * Lift a const on values to a const on IOs
 * @param f
 */
export const lift: <A, B>(f: F.FunctionN<[A], B>) => <R, E>(io: MIO<R, E, A>) => MIO<R, E, B> =
  T.lift;

export const liftEither: <A, E, B>(
  f: F.FunctionN<[A], E.Either<E, B>>
) => F.FunctionN<[A], IO<E, B>> = T.liftEither;

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export const as: <R, E, A, B>(io: MIO<R, E, A>, b: B) => MIO<R, E, B> = T.as;

/**
 * Curried form of as
 * @param b
 */
export const to: <B>(b: B) => <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, B> = T.to;

export const chainTap: <R, E, A>(
  bind: F.FunctionN<[A], MIO<R, E, unknown>>
) => <S2, R2, E2>(inner: MIO<R2, E2, A>) => MIO<R & R2, E | E2, A> = T.chainTap;

/**
 * Map the value produced by an IO to void
 * @param io
 */
export const asUnit: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, void> = T.asUnit;

/**
 * An IO that succeeds immediately with void
 */
export const unit: UIO<void> = T.unit;

/**
 * Curriend form of chainError
 * @param f
 */
export const chainError: <R, E1, E2, A>(
  f: F.FunctionN<[E1], MIO<R, E2, A>>
) => <A2, R2>(rio: MIO<R2, E1, A2>) => MIO<R & R2, E2, A | A2> = T.chainError;

/**
 * Map the error produced by an IO
 * @param f
 */
export const mapError: <E1, E2>(
  f: F.FunctionN<[E1], E2>
) => <R, A>(io: MIO<R, E1, A>) => MIO<R, E2, A> = T.mapError;

/**
 * Zip the result of two IOs together using the provided const
 * @param second
 * @param f
 */
export const zipWith: <A, R2, E2, B, C>(
  second: MIO<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
) => <R, E>(first: MIO<R, E, A>) => MIO<R & R2, E | E2, C> = T.zipWith;

/**
 * Zip the result of two IOs together into a tuple type
 * @param second
 */
export const zip: <R2, E2, B>(
  second: MIO<R2, E2, B>
) => <R, E, A>(first: MIO<R, E, A>) => MIO<R & R2, E | E2, readonly [A, B]> = T.zip;

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export const applyFirst: <R, E, A, R2, E2, B>(
  first: MIO<R, E, A>,
  second: MIO<R2, E2, B>
) => MIO<R & R2, E | E2, A> = T.applyFirst;

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export const applySecond: <R, E, A, R2, E2, B>(
  first: MIO<R, E, A>,
  second: MIO<R2, E2, B>
) => MIO<R & R2, E | E2, B> = T.applySecond;

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export const applySecondL: <R, E, A, R2, E2, B>(
  first: MIO<R, E, A>,
  second: F.Lazy<MIO<R2, E2, B>>
) => MIO<R & R2, E | E2, B> = T.applySecondL;

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export const ap__: <R, E, A, R2, E2, B>(
  ioa: MIO<R, E, A>,
  iof: MIO<R2, E2, F.FunctionN<[A], B>>
) => MIO<R & R2, E | E2, B> = T.ap__;

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export const flip: <R, E, A>(io: MIO<R, E, A>) => MIO<R, A, E> = T.flip;

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export const forever: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, never> = T.forever;

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export const result: <R, E, A>(io: MIO<R, E, A>) => MIO<R, never, ex.Exit<E, A>> = T.result;

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export const interruptible: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.interruptible;

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export const uninterruptible: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.uninterruptible;

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export const after: (ms: number) => MIO<unknown, never, void> = T.after;

/**
 * The type of a const that can restore outer interruptible state
 */
export type InterruptMaskCutout<R, E, A> = F.FunctionN<[MIO<R, E, A>], MIO<R, E, A>>;

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export const uninterruptibleMask: <R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], MIO<R, E, A>>
) => MIO<R, E, A> = T.uninterruptibleMask;

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export const interruptibleMask: <R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], MIO<R, E, A>>
) => MIO<R, E, A> = T.interruptibleMask;

/**
 * Resource acquisition and release construct.
 *
 * Once acquire completes successfully, release is guaranteed to execute following the evaluation of the IO produced by use.
 * Release receives the exit state of use along with the resource.
 * @param acquire
 * @param release
 * @param use
 */

export const bracketExit: <R, E, A, B, R2, E2, R3, E3>(
  acquire: MIO<R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], MIO<R2, E2, unknown>>,
  use: F.FunctionN<[A], MIO<R3, E3, B>>
) => MIO<R & R2 & R3, E | E2 | E3, B> = T.bracketExit;

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export const bracket: <R, E, A, R2, E2, R3, E3, B>(
  acquire: MIO<R, E, A>,
  release: F.FunctionN<[A], MIO<R2, E2, unknown>>,
  use: F.FunctionN<[A], MIO<R3, E3, B>>
) => MIO<R & R2 & R3, E | E2 | E3, B> = T.bracket;

export const onComplete: <R2, E2>(
  finalizer: MIO<R2, E2, unknown>
) => <R, E, A>(ioa: MIO<R, E, A>) => MIO<R & R2, E2 | E, A> = T.onComplete;

export const onInterrupted: <R2, E2>(
  finalizer: MIO<R2, E2, unknown>
) => <R, E, A>(ioa: MIO<R, E, A>) => MIO<R & R2, E2 | E, A> = T.onInterrupted;

export const combineInterruptExit: <R, E, A, R2, E2>(
  ioa: MIO<R, E, A>,
  finalizer: MIO<R2, E2, ex.Interrupt[]>
) => MIO<R & R2, E | E2, A> = T.combineInterruptExit;

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: MIO<unknown, never, void> = T.shifted;

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export const shiftBefore: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.shiftBefore;

/**
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export const shiftAfter: <E, A>(io: MIO<unknown, E, A>) => MIO<unknown, E, A> = T.shiftAfter;

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: MIO<unknown, never, void> = T.shiftedAsync;

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export const shiftAsyncBefore: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.shiftAsyncBefore;

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export const shiftAsyncAfter: <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.shiftAsyncAfter;

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: MIO<unknown, never, never> = T.never;

/**
 * Delay evaluation of inner by some amount of time
 * @param inner
 * @param ms
 */
export const delay: <R, E, A>(inner: MIO<R, E, A>, ms: number) => MIO<R, E, A> = T.delay;

/**
 * Curried form of delay
 */
export const liftDelay: (ms: number) => <R, E, A>(io: MIO<R, E, A>) => MIO<R, E, A> = T.liftDelay;

export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: O.Option<string>;
  /**
   * Send an interrupt signal to this fiber.
   *
   * The this will complete execution once the target fiber has halted.
   * Does nothing if the target fiber is already complete
   */
  readonly interrupt: MIO<unknown, never, ex.Interrupt>;
  /**
   * Await the result of this fiber
   */
  readonly wait: MIO<unknown, never, ex.Exit<E, A>>;
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: MIO<unknown, E, A>;
  /**
   * Poll for a fiber result
   */
  readonly result: MIO<unknown, E, O.Option<A>>;
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: MIO<unknown, never, boolean>;
}

export const makeFiber: <R, E, A>(init: MIO<R, E, A>, name?: string) => MIO<R, never, Fiber<E, A>> =
  T.makeFiber;

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export const fork: <R, E, A>(io: MIO<R, E, A>, name?: string) => MIO<R, never, Fiber<E, A>> =
  T.fork;

/**
 * Race two fibers together and combine their results.
 *
 * This is the primitive from which all other racing and timeout operators are built and you should favor those unless you have very specific needs.
 * @param first
 * @param second
 * @param onFirstWon
 * @param onSecondWon
 */
export const raceFold: <R, R2, R3, R4, E1, E2, E3, A, B, C>(
  first: MIO<R, E1, A>,
  second: MIO<R2, E2, B>,
  onFirstWon: F.FunctionN<[ex.Exit<E1, A>, Fiber<E2, B>], MIO<R3, E3, C>>,
  onSecondWon: F.FunctionN<[ex.Exit<E2, B>, Fiber<E1, A>], MIO<R4, E3, C>>
) => MIO<R & R2 & R3 & R4, E3, C> = T.raceFold;

/**
 * Execute an IO and produce the next IO to run based on whether it completed successfully in the alotted time or not
 * @param source
 * @param ms
 * @param onTimeout
 * @param onCompleted
 */
export const timeoutFold: <R, E1, E2, A, B>(
  source: MIO<R, E1, A>,
  ms: number,
  onTimeout: F.FunctionN<[Fiber<E1, A>], MIO<unknown, E2, B>>,
  onCompleted: F.FunctionN<[ex.Exit<E1, A>], MIO<unknown, E2, B>>
) => MIO<R, E2, B> = T.timeoutFold;

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export const raceFirst: <R, R2, E, A>(io1: MIO<R, E, A>, io2: MIO<R2, E, A>) => MIO<R & R2, E, A> =
  T.raceFirst;

/**
 * Return the result of the first IO to complete successfully.
 *
 * If an error occurs, fall back to the other IO.
 * If both error, then fail with the second errors
 * @param io1
 * @param io2
 */
export const race: <R, R2, E, A>(io1: MIO<R, E, A>, io2: MIO<R2, E, A>) => MIO<R & R2, E, A> =
  T.race;

/**
 * Zip the result of 2 ios executed in parallel together with the provided const.
 * @param ioa
 * @param iob
 * @param f
 */
export const parZipWith: <R, R2, E, E2, A, B, C>(
  ioa: MIO<R, E, A>,
  iob: MIO<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
) => MIO<R & R2, E | E2, C> = T.parZipWith;

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export const parZip: <R, R2, E, A, B>(
  ioa: MIO<R, E, A>,
  iob: MIO<R2, E, B>
) => MIO<R & R2, E, readonly [A, B]> = T.parZip;

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export const parApplyFirst: <R, R2, E, A, B>(
  ioa: MIO<R, E, A>,
  iob: MIO<R2, E, B>
) => MIO<R & R2, E, A> = T.parApplyFirst;

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export const parApplySecond: <R, R2, E, A, B>(
  ioa: MIO<R, E, A>,
  iob: MIO<R2, E, B>
) => MIO<R & R2, E, B> = T.parApplySecond;

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export const parAp: <R, R2, E, A, B>(
  ioa: MIO<R, E, A>,
  iof: MIO<R2, E, F.FunctionN<[A], B>>
) => MIO<R & R2, E, B> = T.parAp;

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export const parAp_: <R, R2, E, E2, A, B>(
  iof: MIO<R, E, F.FunctionN<[A], B>>,
  ioa: MIO<R2, E2, A>
) => MIO<R & R2, E | E2, B> = T.parAp_;

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export const orAbort: <R, E, A>(io: MIO<R, E, A>) => MIO<R, never, A> = T.orAbort;

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export const timeoutOption: <R, E, A>(source: MIO<R, E, A>, ms: number) => MIO<R, E, O.Option<A>> =
  T.timeoutOption;

/**
 * Create an IO from a Promise factory.
 * @param thunk
 */
export const fromPromise: <A>(thunk: F.Lazy<Promise<A>>) => MIO<unknown, unknown, A> =
  T.fromPromise;

export const encaseTask: <A>(task: TA.Task<A>) => MIO<unknown, never, A> = T.encaseTask;

export const encaseTaskEither: <E, A>(taskEither: TE.TaskEither<E, A>) => MIO<unknown, E, A> =
  T.encaseTaskEither;

export const fromPromiseMap: <E>(
  onError: (e: unknown) => E
) => <A>(thunk: F.Lazy<Promise<A>>) => MIO<unknown, E, A> = T.fromPromiseMap;

/**
 * Run the given IO with the provided environment.
 * @param io
 * @param r
 * @param callback
 */
export const run: <E, A>(
  io: MIO<{}, E, A>,
  callback?: F.FunctionN<[ex.Exit<E, A>], void>
) => F.Lazy<void> = T.run;

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export const runSync: <E, A>(io: MIO<{}, E, A>) => E.Either<Error, ex.Exit<E, A>> =
  T.runSync as any;

/* istanbul skip next */
export const runUnsafeSync: <E, A>(io: MIO<{}, E, A>) => A = T.runUnsafeSync as any;

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export const runToPromise: <E, A>(io: MIO<{}, E, A>) => Promise<A> = T.runToPromise;

/**
 * Run an IO returning a promise of an Exit.
 *
 * The Promise will not reject.
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export const runToPromiseExit: <E, A>(io: MIO<{}, E, A>) => Promise<ex.Exit<E, A>> =
  T.runToPromiseExit;

export interface MIOMonad
  extends Monad3E<URI>,
    Bifunctor3<URI>,
    MonadThrow3E<URI>,
    Alt3E<URI>,
    Functor3<URI> {
  /**
   * Produce an new IO that will use the error produced by inner to produce a recovery program
   * @param io
   * @param f
   */
  chainError<R, E1, R2, E2, A, A2>(
    io: MIO<R, E1, A>,
    f: F.FunctionN<[E1], MIO<R2, E2, A2>>
  ): MIO<R & R2, E2, A | A2>;

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
    inner: MIO<R, E1, A1>,
    failure: F.FunctionN<[ex.Cause<E1>], MIO<R2, E2, A2>>,
    success: F.FunctionN<[A1], MIO<R3, E3, A3>>
  ): MIO<R & R2 & R3, E2 | E3, A2 | A3>;

  /**
   * Sequence a Stack and then produce an effect based on the produced value for observation.
   *
   * Produces the result of the iniital Stack
   * @param inner
   * @param bind
   */
  chainTap<R, E, A, R2, E2>(
    inner: MIO<R, E, A>,
    bind: F.FunctionN<[A], MIO<R2, E2, unknown>>
  ): MIO<R & R2, E | E2, A>;

  /**
   * Map over either the error or value produced by an IO
   * @param io
   * @param leftMap
   * @param rightMap
   */
  bimap<R, E1, E2, A, B>(
    io: MIO<R, E1, A>,
    leftMap: F.FunctionN<[E1], E2>,
    rightMap: F.FunctionN<[A], B>
  ): MIO<R, E2, B>;

  /**
   * Map the error produced by an IO
   * @param io
   * @param f
   */
  mapError: MIOMonad["mapLeft"];

  onInterrupted<R, E, A, R2, E2>(
    ioa: MIO<R, E, A>,
    finalizer: MIO<R2, E2, unknown>
  ): MIO<R & R2, E | E2, A>;

  onComplete<R, E, A, R2, E2>(
    ioa: MIO<R, E, A>,
    finalizer: MIO<R2, E2, unknown>
  ): MIO<R & R2, E | E2, A>;
}

export const alt: <R2, E2, A>(
  fy: () => MIO<R2, E2, A>
) => <R, E>(fx: MIO<R, E, A>) => MIO<R & R2, E2, A> = T.alt;

// tslint:disable: no-unbound-method
export const mio: MIOMonad = {
  URI,
  map: T.effect.map,
  of: pure,
  ap: T.effect.ap,
  chain: T.effect.chain,
  bimap: T.effect.bimap,
  mapLeft: T.effect.mapLeft,
  mapError: T.effect.mapError,
  throwError: raiseError,
  chainError: T.effect.chainError,
  foldExit: T.effect.foldExit,
  chainTap: T.effect.chainTap,
  alt: T.effect.alt,
  onInterrupted: T.effect.onInterrupted,
  onComplete: T.effect.onComplete
};

export const {
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
} = pipeable(mio);

export const parMIO: Monad3E<URI> & Bifunctor3<URI> & MonadThrow3E<URI> = {
  URI,
  map: T.effect.map,
  of: pure,
  ap: parAp_,
  chain: T.effect.chain,
  bimap: T.effect.bimap,
  mapLeft: T.effect.mapLeft,
  throwError: raiseError
};

export const getSemigroup: <R, E, A>(s: Semigroup<A>) => Semigroup<MIO<R, E, A>> = T.getSemigroup;

export const getMonoid: <R, E, A>(m: Monoid<A>) => Monoid<MIO<R, E, A>> = T.getMonoid;

/* conditionals */

export const when: (predicate: boolean) => <R, E, A>(ma: MIO<R, E, A>) => MIO<R, E, O.Option<A>> =
  T.when;

export const or_: (
  predicate: boolean
) => <R, E, A>(
  ma: MIO<R, E, A>
) => <R2, E2, B>(mb: MIO<R2, E2, B>) => MIO<R & R2, E | E2, E.Either<A, B>> = T.or_;

export const or: <R, E, A>(
  ma: MIO<R, E, A>
) => <R2, E2, B>(
  mb: MIO<R2, E2, B>
) => (predicate: boolean) => MIO<R & R2, E | E2, E.Either<A, B>> = T.or;

export const condWith: (
  predicate: boolean
) => <R, E, A>(ma: MIO<R, E, A>) => <R2, E2, B>(mb: MIO<R2, E2, B>) => MIO<R & R2, E | E2, A | B> =
  T.condWith;

export const cond: <R, E, A>(
  ma: MIO<R, E, A>
) => <R2, E2, B>(mb: MIO<R2, E2, B>) => (predicate: boolean) => MIO<R & R2, E | E2, A | B> = T.cond;

export const fromNullableM: <R, E, A>(ma: MIO<R, E, A>) => MIO<R, E, O.Option<A>> = T.fromNullableM;

export const getCauseSemigroup: <E>(S: Semigroup<E>) => Semigroup<ex.Cause<E>> =
  T.getCauseSemigroup;

export function getCauseValidationM<E>(
  S: Semigroup<ex.Cause<E>>
): Monad3EC<URI, E> & MonadThrow3EC<URI, E> & Alt3EC<URI, E> {
  return T.getCauseValidationM(S) as any;
}

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S));
}

export function effectify<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => MIO<unknown, L, R>;
export function effectify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => MIO<unknown, L, R>;
export function effectify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => MIO<unknown, L, R>;
export function effectify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => MIO<unknown, L, R>;
export function effectify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => MIO<unknown, L, R>;
export function effectify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => MIO<unknown, L, R>;
export function effectify<L, R>(f: Function): () => MIO<unknown, L, R> {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return async<L, R>((cb) => {
      const cbResolver = (e: L, r: R) =>
        // tslint:disable-next-line: triple-equals
        e != null ? cb(E.left(e)) : cb(E.right(r));
      f.apply(null, args.concat(cbResolver));
      /* istanbul ignore next */
      return (cb) => {
        cb();
      };
    });
  };
}

export const Do = DoG(mio);
export const sequenceS = SS(mio);
export const sequenceT = ST(mio);

export const parDo = DoG(parMIO);
export const parSequenceS = SS(parMIO);
export const parSequenceT = ST(parMIO);

export const sequenceOption = O.option.sequence(mio);

export const traverseOption: <A, R, E, B>(
  f: (a: A) => MIO<R, E, B>
) => (ta: O.Option<A>) => MIO<R, E, O.Option<B>> = (f) => (ta) => O.option.traverse(mio)(ta, f);

export const wiltOption: <A, R, E, B, C>(
  f: (a: A) => MIO<R, E, E.Either<B, C>>
) => (wa: O.Option<A>) => MIO<R, E, Separated<O.Option<B>, O.Option<C>>> = (f) => (wa) =>
  O.option.wilt(mio)(wa, f);

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => MIO<R, E, O.Option<B>>
) => (ta: O.Option<A>) => MIO<R, E, O.Option<B>> = (f) => (ta) => O.option.wither(mio)(ta, f);

export const sequenceEither = E.either.sequence(mio);

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => MIO<R, FE, B>
) => <TE>(ta: E.Either<TE, A>) => MIO<R, FE, E.Either<TE, B>> = (f) => (ta) =>
  E.either.traverse(mio)(ta, f);

export const sequenceTree = TR.tree.sequence(mio);

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => MIO<R, E, B>
) => (ta: TR.Tree<A>) => MIO<R, E, TR.Tree<B>> = (f) => (ta) => TR.tree.traverse(mio)(ta, f);

export const sequenceTreePar = TR.tree.sequence(parMIO);

export const traverseTreePar: <A, R, E, B>(
  f: (a: A) => MIO<R, E, B>
) => (ta: TR.Tree<A>) => MIO<R, E, TR.Tree<B>> = (f) => (ta) => TR.tree.traverse(parMIO)(ta, f);

export const sequenceArray = A.array.sequence(mio);

export const traverseArray: <A, R, E, B>(
  f: (a: A) => MIO<R, E, B>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) => A.array.traverse(mio)(ta, f);

export const traverseArrayWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => MIO<R, E, B>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) => A.array.traverseWithIndex(mio)(ta, f);

export const wiltArray: <A, R, E, B, C>(
  f: (a: A) => MIO<R, E, E.Either<B, C>>
) => (wa: Array<A>) => MIO<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  A.array.wilt(mio)(wa, f);

export const witherArray: <A, R, E, B>(
  f: (a: A) => MIO<R, E, O.Option<B>>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) => A.array.wither(mio)(ta, f);

export const sequenceArrayPar = A.array.sequence(parMIO);

export const traverseArrayPar: <A, R, E, B>(
  f: (a: A) => MIO<R, E, B>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) => A.array.traverse(parMIO)(ta, f);

export const traverseArrayWithIndexPar: <A, R, E, B>(
  f: (i: number, a: A) => MIO<R, E, B>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) =>
  A.array.traverseWithIndex(parMIO)(ta, f);

export const wiltArrayPar: <A, R, E, B, C>(
  f: (a: A) => MIO<R, E, E.Either<B, C>>
) => (wa: Array<A>) => MIO<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  A.array.wilt(parMIO)(wa, f);

export const witherArrayPar: <A, R, E, B>(
  f: (a: A) => MIO<R, E, O.Option<B>>
) => (ta: Array<A>) => MIO<R, E, Array<B>> = (f) => (ta) => A.array.wither(parMIO)(ta, f);
