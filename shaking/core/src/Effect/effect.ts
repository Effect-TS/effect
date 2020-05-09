import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { flatten as flattenArray, filter as filterArray, array } from "fp-ts/lib/Array"
import { Bifunctor4 } from "fp-ts/lib/Bifunctor"
import { Separated } from "fp-ts/lib/Compactable"
import { Either, left, right, either, fold as foldEither } from "fp-ts/lib/Either"
import { Functor4 } from "fp-ts/lib/Functor"
import { Monoid } from "fp-ts/lib/Monoid"
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"
import { Option, some, none, option, fromNullable } from "fp-ts/lib/Option"
import { record } from "fp-ts/lib/Record"
import { Semigroup } from "fp-ts/lib/Semigroup"
import { Task } from "fp-ts/lib/Task"
import { TaskEither } from "fp-ts/lib/TaskEither"
import { tree, Tree } from "fp-ts/lib/Tree"
import { Lazy, FunctionN, constant, flow, identity } from "fp-ts/lib/function"
import { pipeable, pipe } from "fp-ts/lib/pipeable"

import { Deferred, makeDeferred } from "../Deferred"
import {
  Cause,
  raise,
  abort,
  withRemaining,
  Exit,
  done,
  interrupt,
  interruptWithError
} from "../Exit"
import { Ref, makeRef } from "../Ref"
import {
  EffectURI as URI,
  IPure,
  IRaised,
  ICompleted,
  ISuspended,
  AsyncFn,
  IAsync,
  AsyncCancelContFn,
  IInterruptibleRegion,
  Instructions,
  IPureTag,
  IChain,
  IPureEither,
  IPureOption,
  IAccessInterruptible,
  IAccessRuntime,
  IAccessEnv,
  IProvideEnv,
  IMap,
  ICollapse
} from "../Support/Common"
import {
  Effect,
  Provider,
  Sync,
  SyncE,
  AsyncE,
  Async,
  AsyncRE,
  SyncR,
  AsyncR,
  SyncRE
} from "../Support/Common/effect"
import { Driver, DriverImpl, DriverSyncImpl } from "../Support/Driver"
import { ForM } from "../Support/For"
import {
  Monad4E,
  MonadThrow4E,
  Alt4E,
  Monad4EC,
  Monad4ECP,
  MonadThrow4EC,
  MonadThrow4ECP,
  Alt4EC,
  Monad4EP,
  MonadThrow4EP
} from "../Support/Overloads"
import { Runtime } from "../Support/Runtime"
import { fst, snd, tuple2 } from "../Support/Utils"

export { Effect, Provider, Sync, SyncE, AsyncE, Async, AsyncRE, SyncR, AsyncR, SyncRE }

/**
 * An IO has succeeded
 * @param a the value
 */
export function pure<A>(a: A): Sync<A> {
  return new IPure(a) as any
}

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: Cause<E>): SyncE<E, A> {
  return new IRaised(e) as any
}

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E>(e: E): SyncE<E, never> {
  return raised(raise(e))
}

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Sync<never> {
  return raised(abort(u))
}

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: Sync<never> = raised(interrupt)

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E = never, A = never>(exit: Exit<E, A>): SyncE<E, A> {
  return new ICompleted(exit) as any
}

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export function suspended<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return new ISuspended(thunk) as any
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export function sync<A>(thunk: Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()))
}

export function trySync<A = unknown>(thunk: Lazy<A>): SyncE<unknown, A> {
  return suspended(() => {
    try {
      return pure(thunk())
    } catch (e) {
      return raiseError(e)
    }
  })
}

export function trySyncMap<E>(
  onError: (e: unknown) => E
): <A = unknown>(thunk: Lazy<A>) => SyncE<E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk())
      } catch (e) {
        return raiseError(onError(e))
      }
    })
}

export function tryEffect<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, unknown, A> {
  return flatten(trySync(thunk))
}

export function tryEffectMap<E>(
  onError: (e: unknown) => E
): <S, R, E2, A>(thunk: Lazy<Effect<S, R, E2, A>>) => Effect<S, R, E | E2, A> {
  return (thunk) => flatten(trySyncMap(onError)(thunk))
}

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(op: AsyncFn<E, A>): AsyncE<E, A> {
  return new IAsync(op) as any
}

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export function asyncTotal<A>(
  op: FunctionN<[FunctionN<[A], void>], AsyncCancelContFn>
): Async<A> {
  return async((callback) => op((a) => callback(right(a))))
}

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  flag: boolean
): Effect<S, R, E, A> {
  return new IInterruptibleRegion(inner, flag) as any
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
function chain_<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return (((inner as any) as Instructions).tag() === IPureTag
    ? bind(((inner as any) as IPure<A>).a)
    : new IChain(inner, bind)) as any
}

export function chainOption<E>(
  onEmpty: Lazy<E>
): <A, B>(
  bind: FunctionN<[A], Option<B>>
) => <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty))
}

export function chainEither<A, E, B>(
  bind: FunctionN<[A], Either<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)))
}

export function chainTask<A, B>(
  bind: FunctionN<[A], Task<B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)))
}

export function chainTaskEither<A, E, B>(
  bind: FunctionN<[A], TaskEither<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)))
}

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Either<E, A>): SyncE<E, A> {
  return new IPureEither(e) as any
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: Option<A>, onError: Lazy<E>): SyncE<E, A> {
  return new IPureOption(o, onError) as any
}

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export function foldExit<S1, E1, RF, E2, A1, S2, E3, A2, RS>(
  failure: FunctionN<[Cause<E1>], Effect<S1, RF, E2, A2>>,
  success: FunctionN<[A1], Effect<S2, RS, E3, A2>>
): <S, R>(io: Effect<S, R, E1, A1>) => Effect<S | S1 | S2, RF & RS & R, E2 | E3, A2> {
  return (io) => foldExit_(io, failure, success)
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: Sync<boolean> = new IAccessInterruptible(
  identity
) as any

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Sync<Runtime> = new IAccessRuntime(identity) as any

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */
export function withRuntime<S, R, E, A>(
  f: FunctionN<[Runtime], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessRuntime, f)
}

export function accessEnvironment<R>(): SyncR<R, R> {
  return new IAccessEnv() as any
}

export function accessM<S, R, R2, E, A>(
  f: FunctionN<[R], Effect<S, R2, E, A>>
): Effect<S, R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f)
}

export function access<R, A>(f: FunctionN<[R], A>): SyncR<R, A> {
  return map_(accessEnvironment<R>(), f)
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
  return <S, R2, E, A>(eff: Effect<S, R2 & R, E, A>): Effect<S, R2, E, A> =>
    provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(
      eff
    )
}

/**
 * Like provide where environment is resolved monadically
 */
export function provideM<S, R, R3, E2>(
  rm: Effect<S, R3, E2, R>,
  inverted: "regular" | "inverted" = "regular"
): Provider<R3, R, E2, S> {
  return <S2, R2, E, A>(
    eff: Effect<S2, R2 & R, E, A>
  ): Effect<S | S2, R2 & R3, E | E2, A> =>
    chain_(rm, (r) =>
      provideR((r2: R2) =>
        inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }
      )(eff)
    )
}

export const provideWith = <R, A>(
  f: (_: R) => A,
  _: "regular" | "inverted" = "regular"
): Provider<R, A, never, never> => provideM(access(f), _)

export const provideWithM = <R2, S, R, E, A>(
  f: (_: R2) => Effect<S, R, E, A>,
  _: "regular" | "inverted" = "regular"
): Provider<R & R2, A, E, S> => provideM(accessM(f), _)

const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R2, E, A> => accessM((r2: R2) => new IProvideEnv(ma, f(r2)) as any)

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
function map_<S, R, E, A, B>(
  base: Effect<S, R, E, A>,
  f: FunctionN<[A], B>
): Effect<S, R, E, B> {
  return (((base as any) as Instructions).tag() === IPureTag
    ? new IPure(f(((base as any) as IPure<A>).a))
    : new IMap(base, f)) as any
}

/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(
  f: FunctionN<[A], B>
): <S, R, E>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => map_(io, f)
}

export function liftEither<A, E, B>(
  f: FunctionN<[A], Either<E, B>>
): FunctionN<[A], SyncE<E, B>> {
  return (a) => suspended(() => fromEither(f(a)))
}

export function liftOption<E>(
  onNone: () => E
): <A, B>(f: FunctionN<[A], Option<B>>) => FunctionN<[A], SyncE<E, B>> {
  return (f) => (a) => suspended(() => encaseOption(f(a), onNone))
}

/**
 * Combines T.chain and T.fromOption
 */
export const flattenOption = <E>(onNone: () => E) => <S, R, E2, A>(
  eff: Effect<S, R, E2, Option<A>>
): Effect<S, R, E | E2, A> => chain_(eff, (x) => encaseOption(x, onNone))

export const flattenEither = <S, R, E, E2, A>(
  eff: Effect<S, R, E, Either<E2, A>>
): Effect<S, R, E | E2, A> => chain_(eff, encaseEither)

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<S, R, E, A, B>(io: Effect<S, R, E, A>, b: B): Effect<S, R, E, B> {
  return map_(io, constant(b))
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(
  b: B
): <S, R, E, A>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => as(io, b)
}

export function chainTap<S, R, E, A>(
  bind: FunctionN<[A], Effect<S, R, E, unknown>>
): <S2, R2, E2>(inner: Effect<S2, R2, E2, A>) => Effect<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind)
}

const chainTap_ = <S, R, E, A, S2, R2, E2>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
): Effect<S | S2, R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a))

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, void> {
  return as(io, undefined)
}

/**
 * An IO that succeeds immediately with void
 */
export const unit: Sync<void> = pure(undefined)

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<S, R, E1, E2, A>(
  f: (_: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S, R, E2, A>
): <S2, A2, R2>(rio: Effect<S2, R2, E1, A2>) => Effect<S | S2, R & R2, E2, A | A2> {
  return (io) => chainError_(io, f)
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: FunctionN<[E1], E2>
): <S, R, A>(io: Effect<S, R, E1, A>) => Effect<S, R, E2, A> {
  return (io) => mapLeft_(io, f)
}

function bimap_<S, R, E1, E2, A, B>(
  io: Effect<S, R, E1, A>,
  leftMap: FunctionN<[E1], E2>,
  rightMap: FunctionN<[A], B>
): Effect<S, R, E2, B> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise"
        ? completed(
            withRemaining(
              raise(leftMap(cause.error)),
              ...(cause.remaining._tag === "Some" ? cause.remaining.value : [])
            )
          )
        : completed(cause),
    flow(rightMap, pure)
  )
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<S | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)))
}

export function zipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => Effect<S | S2, R & R2, E | E2, C> {
  return (first) => zipWith_(first, second, f)
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
function zip_<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith_(first, second, tuple2)
}

export function zip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(
  first: Effect<S, R, E, A>
) => Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return (first) => zip_(first, second)
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, A> {
  return zipWith_(first, second, fst)
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(first, second, snd)
}

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Lazy<Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return chain_(first, second)
}

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<S, R, E, A, S2, R2, E2, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): Effect<S | S2, R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith_(ioa, iof, (a, f) => f(a))
}

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
function ap_<S, R, E, A, B, S2, R2, E2>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(iof, ioa, (f, a) => f(a))
}

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, A, E> {
  return foldExit_(
    io,
    (error) => (error._tag === "Raise" ? pure(error.error) : completed(error)),
    raiseError
  )
}

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, never> {
  return chain_(io, () => forever(io))
}

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, never, Exit<E, A>> {
  return foldExit_(io, pure, (d) => pure(done(d)))
}

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return interruptibleRegion(io, true)
}

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return interruptibleRegion(io, false)
}

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Async<void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  )
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<S, R, E, A> = FunctionN<
  [Effect<S, R, E, A>],
  Effect<S, R, E, A>
>

function makeInterruptMaskCutout<S, R, E, A>(
  state: boolean
): InterruptMaskCutout<S, R, E, A> {
  return (inner) => interruptibleRegion(inner, state)
}

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<S, R, E, A>(
  f: FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<S, R, E, A>(flag)
    return uninterruptible(f(cutout))
  })
}

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export function interruptibleMask<S, R, E, A>(
  f: FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessInterruptible, (flag) =>
    interruptible(f(makeInterruptMaskCutout(flag)))
  )
}

function combineFinalizerExit<E, A>(
  fiberExit: Exit<E, A>,
  releaseExit: Exit<E, unknown>
): Exit<E, A> {
  if (fiberExit._tag === "Done" && releaseExit._tag === "Done") {
    return fiberExit
  } else if (fiberExit._tag === "Done") {
    return releaseExit as Cause<E>
  } else if (releaseExit._tag === "Done") {
    return fiberExit
  } else {
    return {
      ...fiberExit,
      remaining: some(
        fiberExit.remaining._tag === "Some"
          ? ([...fiberExit.remaining.value, releaseExit] as NonEmptyArray<Cause<any>>)
          : ([releaseExit] as NonEmptyArray<Cause<any>>)
      )
    }
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

export function bracketExit<S, R, E, A, B, S2, R2, E2, S3, R3, E3>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A, Exit<E | E3, B>], Effect<S2, R2, E2, unknown>>,
  use: FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  return uninterruptibleMask((cutout) =>
    chain_(acquire, (a) =>
      chain_(result(cutout(use(a))), (exit) =>
        chain_(result(release(a, exit as Exit<E | E3, B>)), (finalize) =>
          completed(combineFinalizerExit(exit, finalize))
        )
      )
    )
  )
}

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export function bracket<S, R, E, A, S2, R2, E2, S3, R3, E3, B>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A], Effect<S2, R2, E2, unknown>>,
  use: FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use)
}

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
function onComplete_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) =>
        completed(combineFinalizerExit(exit, finalize))
      )
    )
  )
}

export function onComplete<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onComplete_(ioa, finalizer)
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
function onInterrupted_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  )
}

export function onInterrupted<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onInterrupted_(ioa, finalizer)
}

export function combineInterruptExit<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, Exit<any, any>[]>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [
                  ...(exit.errors ? exit.errors : []),
                  ...flattenArray(
                    finalize.value.map((x) =>
                      x._tag === "Interrupt" ? (x.errors ? x.errors : []) : []
                    )
                  )
                ],
                filterArray((x): x is Error => x !== undefined)
              )

              return errors.length > 0
                ? completed(interruptWithError(...errors))
                : completed(exit)
            } else {
              throw new Error("BUG: interrupt finalizer should not fail")
            }
          })
        : completed(exit)
    )
  )
}

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: Async<void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => {
      runtime.dispatch(callback, undefined)
      return (cb) => {
        cb()
      }
    })
  )
)

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shifted, io)
}

/**
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shifted)
}

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Async<void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
  )
)

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shiftedAsync, io)
}

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shiftedAsync)
}

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Async<never> = asyncTotal(() => {
  const handle = setInterval(() => {
    //
  }, 60000)
  /* istanbul ignore next */
  return (cb) => {
    clearInterval(handle)
    cb()
  }
})

/**
 * An IO that produces a void result when res is involed.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 *
 * Example usage:
 *
 * until((cb) => {
 *    process.on("SIGINT", () => {
 *      cb();
 *    });
 *    process.on("SIGTERM", () => {
 *      cb();
 *    });
 * })
 *
 */
export const until = (f: (res: () => void) => void) =>
  asyncTotal<void>((res) => {
    const handle = setInterval(() => {
      // keep process going
    }, 60000)
    f(() => {
      res(undefined)
      clearInterval(handle)
    })
    return (cb) => {
      clearInterval(handle)
      cb()
    }
  })

/**
 * Delay evaluation of inner by some amount of time
 * @param inner
 * @param ms
 */
export function delay<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R, E, A> {
  return applySecond(after(ms), inner)
}

/**
 * Curried form of delay
 */
export function liftDelay(
  ms: number
): <S, R, E, A>(io: Effect<S, R, E, A>) => AsyncRE<R, E, A> {
  return (io) => delay(io, ms)
}

export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: Option<string>
  /**
   * Send an interrupt signal to this fiber.
   *
   * The this will complete execution once the target fiber has halted.
   * Does nothing if the target fiber is already complete
   */
  readonly interrupt: Async<Exit<E, A>>
  /**
   * Await the result of this fiber
   */
  readonly wait: Async<Exit<E, A>>
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: AsyncE<E, A>
  /**
   * Poll for a fiber result
   */
  readonly result: SyncE<E, Option<A>>
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Sync<boolean>
}

export class FiberImpl<E, A> implements Fiber<E, A> {
  name = fromNullable(this.n)

  sendInterrupt = sync(() => {
    this.driver.interrupt()
  })
  wait = asyncTotal((f: FunctionN<[Exit<E, A>], void>) => this.driver.onExit(f))
  interrupt = applySecond(this.sendInterrupt, this.wait)
  join = chain_(this.wait, completed)
  result = chain_(
    sync(() => this.driver.completed),
    (opt) => (opt === null ? pureNone : map_(completed(opt), some))
  )
  isComplete = sync(() => this.driver.completed !== null)

  constructor(readonly driver: Driver<E, A>, readonly n?: string) {}
}

const pureNone = pure(none)

/**
 * Implementation of Stack/waver fork. Creates an IO that will fork a fiber in the background
 * @param init
 * @param name
 */
export function makeFiber<S, R, E, A>(
  init: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return access((r: R) => {
    const driver = new DriverImpl<E, A>()
    const fiber = new FiberImpl(driver, name)
    driver.start(provide(r)(init))
    return fiber
  })
}

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function fork<S, R, E, A>(
  io: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return makeFiber(io, name)
}

function completeLatched<E1, E2, E3, A, B, C, R>(
  latch: Ref<boolean>,
  channel: Deferred<unknown, R, E3, C>,
  combine: FunctionN<[Exit<E1, A>, Fiber<E2, B>], AsyncRE<R, E3, C>>,
  other: Fiber<E2, B>
): FunctionN<[Exit<E1, A>], AsyncR<R, void>> {
  return (exit) => {
    const act: Async<AsyncR<R, void>> = latch.modify((flag) =>
      !flag
        ? ([channel.from(combine(exit, other)), true] as const)
        : ([unit, flag] as const)
    )
    return flatten(act)
  }
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
export function raceFold<S, S2, S3, S4, R, R2, R3, R4, E1, E2, E3, A, B, C, D>(
  first: Effect<S, R, E1, A>,
  second: Effect<S2, R2, E2, B>,
  onFirstWon: FunctionN<[Exit<E1, A>, Fiber<E2, B>], Effect<S3, R3, E3, C>>,
  onSecondWon: FunctionN<[Exit<E2, B>, Fiber<E1, A>], Effect<S4, R4, E3, D>>
): AsyncRE<R & R2 & R3 & R4, E3, C | D> {
  return accessM((r: R & R2) =>
    uninterruptibleMask<unknown, R3 & R4, E3, C | D>((cutout) =>
      chain_(makeRef<boolean>(false), (latch) =>
        chain_(makeDeferred<unknown, R3 & R4, E3, C | D>(), (channel) =>
          chain_(fork(provide(r)(first)), (fiber1) =>
            chain_(fork(provide(r)(second)), (fiber2) =>
              chain_(
                fork(
                  chain_(
                    fiber1.wait,
                    completeLatched(latch, channel, onFirstWon, fiber2)
                  )
                ),
                () =>
                  chain_(
                    fork(
                      chain_(
                        fiber2.wait,
                        completeLatched(latch, channel, onSecondWon, fiber1)
                      )
                    ),
                    () =>
                      combineInterruptExit(
                        cutout(channel.wait),
                        chain_(fiber1.interrupt, (i1) =>
                          map_(fiber2.interrupt, (i2) => [i1, i2])
                        )
                      )
                  )
              )
            )
          )
        )
      )
    )
  )
}

/**
 * Execute an IO and produce the next IO to run based on whether it completed successfully in the alotted time or not
 * @param source
 * @param ms
 * @param onTimeout
 * @param onCompleted
 */
export function timeoutFold<S, S1, S2, R, R2, R3, E1, E2, A, B, C>(
  source: Effect<S, R, E1, A>,
  ms: number,
  onTimeout: FunctionN<[Fiber<E1, A>], Effect<S1, R2, E2, B>>,
  onCompleted: FunctionN<[Exit<E1, A>], Effect<S2, R3, E2, C>>
): AsyncRE<R & R2 & R3, E2, B | C> {
  return raceFold(
    source,
    after(ms),
    /* istanbul ignore next */
    (exit, delayFiber) => applySecond(delayFiber.interrupt, onCompleted(exit)),
    (_, fiber) => onTimeout(fiber)
  )
}

function interruptLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return chain_(loser.interrupt, (x) =>
    x._tag === "Interrupt" && x.errors && x.errors.length > 0
      ? completed(x)
      : completed(exit)
  )
}

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export function raceFirst<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser)
}

function fallbackToLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return exit._tag === "Done" ? interruptLoser(exit, loser) : loser.join
}

/**
 * Return the result of the first IO to complete successfully.
 *
 * If an error occurs, fall back to the other IO.
 * If both error, then fail with the second errors
 * @param io1
 * @param io2
 */
export function race<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser)
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<S, S2, R, R2, E, E2, A, B, C>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith_(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith_(aFiber.join, completed(bExit), f)
  )
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * Interrupt at first failure returning the error
 * @param ioa
 * @param iob
 * @param f
 */
export function parFastZipWith<S, S2, R, R2, E, E2, A, B, C>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) =>
      aExit._tag === "Done"
        ? zipWith_(completed(aExit), bFiber.join, f)
        : chain_(bFiber.isComplete, (isCompleted) =>
            isCompleted
              ? zipWith_(completed(aExit), bFiber.join, f)
              : chain_(bFiber.interrupt, (x) =>
                  x._tag === "Interrupt" && x.errors && x.errors.length > 0
                    ? completed(x)
                    : completed(aExit)
                )
          ),
    (bExit, aFiber) =>
      bExit._tag === "Done"
        ? zipWith_(aFiber.join, completed(bExit), f)
        : chain_(aFiber.isComplete, (isCompleted) =>
            isCompleted
              ? zipWith_(aFiber.join, completed(bExit), f)
              : chain_(aFiber.interrupt, (x) =>
                  x._tag === "Interrupt" && x.errors && x.errors.length > 0
                    ? completed(x)
                    : completed(bExit)
                )
          )
  )
}

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export function parZip<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2)
}

/**
 * Tuple the result of 2 ios executed in parallel
 * Interrupt at first error
 * @param ioa
 * @param iob
 */
export function parFastZip<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2)
}

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export function parApplyFirst<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, A> {
  return parZipWith(ioa, iob, fst)
}

/**
 * Execute two ios in parallel and take the result of the first.
 * Interrupt at first error
 * @param ioa
 * @param iob
 */
export function parFastApplyFirst<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, A> {
  return parFastZipWith(ioa, iob, fst)
}

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export function parApplySecond<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(ioa, iob, snd)
}

/**
 * Exeute two IOs in parallel and take the result of the second
 * Interrupt at first error
 * @param ioa
 * @param iob
 */
export function parFastApplySecond<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(ioa, iob, snd)
}

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(ioa, iof, (a, f) => f(a))
}

/**
 * Parallel form of ap
 * Interrupt at first error
 * @param ioa
 * @param iof
 */
export function parFastAp<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(ioa, iof, (a, f) => f(a))
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a))
}

/**
 * Parallel form of ap_ using parFastZipWith
 * @param iof
 * @param ioa
 */
export function parFastAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parFastZipWith(iof, ioa, (f, a) => f(a))
}

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, never, A> {
  return chainError_(io, (e, rem) =>
    completed(withRemaining(abort(e), ...(rem._tag === "Some" ? rem.value : [])))
  )
}

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export function timeoutOption<S, R, E, A>(
  source: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R, E, Option<A>> {
  return timeoutFold(
    source,
    ms,
    (actionFiber) => applySecond(actionFiber.interrupt, pureNone),
    (exit) => map_(completed(exit), some)
  )
}

/**
 * Create an IO from a Promise factory.
 * @param thunk
 */
export function fromPromise<A>(thunk: Lazy<Promise<A>>): AsyncE<unknown, A> {
  return uninterruptible(
    async<unknown, A>((callback) => {
      thunk()
        .then((v) => callback(right(v)))
        .catch((e) => callback(left(e)))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
  )
}

export function encaseTask<A>(task: Task<A>): Async<A> {
  return orAbort(fromPromise(task))
}

export function encaseTaskEither<E, A>(taskEither: TaskEither<E, A>): AsyncE<E, A> {
  return async<E, A>((callback) => {
    taskEither().then(callback)
    /* istanbul ignore next */
    return (cb) => {
      cb()
    }
  })
}

export function fromPromiseMap<E>(
  onError: (e: unknown) => E
): <A>(thunk: Lazy<Promise<A>>) => AsyncE<E, A> {
  return <A>(thunk: Lazy<Promise<A>>) =>
    async<E, A>((callback) => {
      thunk()
        .then((v) => callback(right(v)))
        .catch((e) => callback(left(onError(e))))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
}

/**
 * Run the given IO with the provided environment.
 * @param io
 * @param r
 * @param callback
 */
export function run<E, A>(
  io: AsyncRE<{}, E, A>,
  callback?: FunctionN<[Exit<E, A>], void>
): (cb?: (exit: Exit<E, A>) => void) => void {
  const driver = new DriverImpl<E, A>()
  if (callback) {
    driver.onExit(callback)
  }
  driver.start(io)
  return (cb) => {
    driver.interrupt()
    if (cb) {
      driver.onExit(cb)
    }
  }
}

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export function runSync<E, A>(io: SyncRE<{}, E, A>): Exit<E, A> {
  return pipe(
    new DriverSyncImpl<E, A>().start(io),
    foldEither(
      (e) => {
        throw e
      },
      (e) => e
    )
  )
}

/* istanbul skip next */
export function runUnsafeSync<E, A>(io: SyncRE<{}, E, A>): A {
  const result = runSync(io)

  if (result._tag !== "Done") {
    throw result._tag === "Raise"
      ? result.error
      : result._tag === "Abort"
      ? result.abortedWith
      : result
  }
  return result.value
}

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromise<E, A>(io: AsyncRE<{}, E, A>): Promise<A> {
  return new Promise((resolve, reject) =>
    run(io, (exit) => {
      switch (exit._tag) {
        case "Done":
          resolve(exit.value)
          return
        case "Abort":
          reject(exit.abortedWith)
          return
        case "Raise":
          reject(exit.error)
          return
        case "Interrupt":
          reject()
          return
      }
    })
  )
}

/**
 * Run an IO returning a promise of an Exit.
 *
 * The Promise will not reject.
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromiseExit<E, A>(io: AsyncRE<{}, E, A>): Promise<Exit<E, A>> {
  return new Promise((result) => run(io, result))
}

function chainError_<S, R, E1, S2, R2, E2, A, A2>(
  io: Effect<S, R, E1, A>,
  f: (_: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise" ? f(cause.error, cause.remaining) : completed(cause),
    pure
  )
}

const chainErrorTap_ = <S, R, E1, S2, R2, E2, A>(
  io: Effect<S, R, E1, A>,
  f: (
    _: E1,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, unknown>
) =>
  chainError_(io, (e, remaining) =>
    foldExit_(
      f(e, remaining),
      (_) =>
        completed(
          withRemaining(
            _,
            raise(e),
            ...(remaining._tag === "Some" ? remaining.value : [])
          )
        ),
      () =>
        completed(
          withRemaining(raise(e), ...(remaining._tag === "Some" ? remaining.value : []))
        )
    )
  )

export const chainErrorTap = <S, R, E1, E2>(
  f: (e: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S, R, E2, unknown>
) => <S2, R2, A>(io: Effect<S2, R2, E1, A>) => chainErrorTap_(io, f)

export interface EffectMonad
  extends Monad4E<URI>,
    Bifunctor4<URI>,
    MonadThrow4E<URI>,
    Alt4E<URI>,
    Functor4<URI> {
  chainError<S1, S2, R, E1, R2, E2, A, A2>(
    io: Effect<S1, R, E1, A>,
    f: (_: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S2, R2, E2, A2>
  ): Effect<S1 | S2, R & R2, E2, A | A2>

  foldExit<S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
    inner: Effect<S1, R, E1, A1>,
    failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
    success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
  ): Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3>

  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: Effect<S1, R, E, A>,
    bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
  ): Effect<S1 | S2, R & R2, E | E2, A>

  chainErrorTap<S1, S2, R, E1, R2, E2, A>(
    io: Effect<S1, R, E1, A>,
    f: (
      _: E1,
      remaining: Option<NonEmptyArray<Cause<any>>>
    ) => Effect<S2, R2, E2, unknown>
  ): Effect<S1 | S2, R & R2, E1 | E2, A>

  mapError: EffectMonad["mapLeft"]

  onInterrupted<S1, S2, R, E, A, R2, E2>(
    ioa: Effect<S1, R, E, A>,
    finalizer: Effect<S2, R2, E2, unknown>
  ): Effect<S1 | S2, R & R2, E | E2, A>

  onComplete<S1, S2, R, E, A, R2, E2>(
    ioa: Effect<S1, R, E, A>,
    finalizer: Effect<S2, R2, E2, unknown>
  ): Effect<S1 | S2, R & R2, E | E2, A>

  zip<S, R, E, A, S2, R2, E2, B>(
    first: Effect<S, R, E, A>,
    second: Effect<S2, R2, E2, B>
  ): Effect<S | S2, R & R2, E | E2, readonly [A, B]>

  zipWith<S, R, E, A, S2, R2, E2, B, C>(
    first: Effect<S, R, E, A>,
    second: Effect<S2, R2, E2, B>,
    f: FunctionN<[A, B], C>
  ): Effect<S | S2, R & R2, E | E2, C>
}

const foldExit_: EffectMonad["foldExit"] = (inner, failure, success) =>
  new ICollapse(inner, failure, success) as any

const mapLeft_: EffectMonad["mapLeft"] = (io, f) =>
  chainError_(io, (x, rem) =>
    completed(withRemaining(raise(f(x)), ...(rem._tag === "Some" ? rem.value : [])))
  )

const alt_: EffectMonad["alt"] = chainError_

export function alt<R2, E2, A>(
  fy: () => AsyncRE<R2, E2, A>
): <R, E, B>(fx: AsyncRE<R, E, B>) => AsyncRE<R & R2, E2, A | B> {
  return (fx) => alt_(fx, fy)
}

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
  chainTap: chainTap_,
  chainErrorTap: chainErrorTap_,
  alt: alt_,
  onInterrupted: onInterrupted_,
  onComplete: onComplete_,
  zip: zip_,
  zipWith: zipWith_
}

export const Do = () => DoG(effect)
export const For = () => ForM(effect)
export const sequenceS = SS(effect)
export const sequenceT = ST(effect)

export const parEffect: Monad4EP<URI> & MonadThrow4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parAp_,
  chain: chain_,
  throwError: raiseError
}

export const parDo = () => DoG(parEffect)
export const parFor = () => ForM(parEffect)
export const parSequenceS = SS(parEffect)
export const parSequenceT = ST(parEffect)

/* Note that this instance is not respecting the classical apply law */
export const parFastEffect: Monad4EP<URI> & MonadThrow4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parFastAp_,
  chain: chain_,
  throwError: raiseError
}

export const parFastDo = () => DoG(parFastEffect)
export const parFastFor = () => ForM(parFastEffect)
export const parFastSequenceS = SS(parFastEffect)
export const parFastSequenceT = ST(parFastEffect)

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
} = pipeable(effect)

export { Erase } from "../Utils"
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
}

export function getSemigroup<S, R, E, A>(
  s: Semigroup<A>
): Semigroup<Effect<S, R, E, A>> {
  return {
    concat(x: Effect<S, R, E, A>, y: Effect<S, R, E, A>): Effect<S, R, E, A> {
      return zipWith_(x, y, s.concat)
    }
  }
}

export function getMonoid<S, R, E, A>(m: Monoid<A>): Monoid<Effect<S, R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  }
}

/* conditionals */

export function when(
  predicate: boolean
): <S, R, E, A>(ma: Effect<S, R, E, A>) => Effect<S, R, E, Option<A>> {
  return (ma) => (predicate ? map_(ma, some) : pure(none))
}

export function or_(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => Effect<S | S2, R & R2, E | E2, Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, left) : map_(mb, right))
}

export function or<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, left) : map_(mb, right))
}

export function condWith(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (ma) => (mb) => (predicate ? ma : mb)
}

export function cond<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb)
}

export function fromNullableM<S, R, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R, E, Option<NonNullable<A>>> {
  return map_(ma, fromNullable)
}

export function getCauseSemigroup<E>(S: Semigroup<E>): Semigroup<Cause<E>> {
  return {
    concat: (ca, cb): Cause<E> => {
      if (ca._tag === "Interrupt" || cb._tag === "Interrupt") {
        return ca
      }
      if (ca._tag === "Abort") {
        return ca
      }
      if (cb._tag === "Abort") {
        return cb
      }
      return raise(S.concat(ca.error, cb.error))
    }
  }
}

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S))
}

export function getParValidationM<E>(S: Semigroup<E>) {
  return getParCauseValidationM(getCauseSemigroup(S))
}

export function getParCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad4ECP<URI, E> & MonadThrow4ECP<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    _CTX: "async",
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<unknown, R & R2, E, B> =>
      chain_(parZip(result(fa), result(fab)), ([faEx, fabEx]) =>
        fabEx._tag === "Done"
          ? faEx._tag === "Done"
            ? pure(fabEx.value(faEx.value))
            : raised(faEx)
          : faEx._tag === "Done"
          ? raised(fabEx)
          : raised(S.concat(fabEx, faEx))
      ),
    throwError: raiseError,
    alt: <S1, S2, R, R2, A>(
      fa: Effect<S1, R, E, A>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A> =>
      foldExit_(
        fa,
        (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure),
        pure
      )
  }
}

export function getCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad4EC<URI, E> & MonadThrow4EC<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, B> =>
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
    throwError: raiseError,
    alt: <S1, S2, R, R2, A>(
      fa: Effect<S1, R, E, A>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A> =>
      foldExit_(
        fa,
        (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure),
        pure
      )
  }
}

export function effectify<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => AsyncE<L, R>
export function effectify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => AsyncE<L, R>
export function effectify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => AsyncE<L, R>
export function effectify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => AsyncE<L, R>
export function effectify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => AsyncE<L, R>
export function effectify<A, B, C, D, E, L, R>(
  f: (
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void
): (a: A, b: B, c: C, d: D, e: E) => AsyncE<L, R>
export function effectify<L, R>(f: Function): () => AsyncE<L, R> {
  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments)
    return async<L, R>((cb) => {
      const cbResolver = (e: L, r: R) =>
        // tslint:disable-next-line: triple-equals
        e != null ? cb(left(e)) : cb(right(r))
      // eslint-disable-next-line prefer-spread
      f.apply(null, args.concat(cbResolver))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
  }
}

export const sequenceOption = option.sequence(effect)

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  option.traverse(effect)(ta, f)

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Option<A>) => Effect<S, R, E, Separated<Option<B>, Option<C>>> = (f) => (
  wa
) => option.wilt(effect)(wa, f)

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  option.wither(effect)(ta, f)

export const sequenceEither = either.sequence(effect)

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => Effect<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => Effect<S, R, FE, Either<TE, B>> = (f) => (ta) =>
  either.traverse(effect)(ta, f)

export const sequenceTree = tree.sequence(effect)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => Effect<S, R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(effect)(ta, f)

export const parSequenceTree = tree.sequence(parEffect)
export const parFastSequenceTree = tree.sequence(parFastEffect)

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(parEffect)(ta, f)

export const parFastTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(parFastEffect)(ta, f)

export const sequenceArray = array.sequence(effect)

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(effect)(ta, f)

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(effect)(ta, f)

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Array<A>) => Effect<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(effect)(wa, f)

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  array.wither(effect)(ta, f)

export const parSequenceArray = array.sequence(parEffect)

export const parFastSequenceArray = array.sequence(parFastEffect)

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverse(parEffect)(ta, f)

export const parFastTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverse(parFastEffect)(ta, f)

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(parEffect)(ta, f)

export const parFastTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(parFastEffect)(ta, f)

export const parWiltArray: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(parEffect)(wa, f)

export const parFastWiltArray: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(parFastEffect)(wa, f)

export const parWitherArray: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.wither(parEffect)(ta, f)

export const parFastWitherArray: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.wither(parFastEffect)(ta, f)

export const sequenceRecord = record.sequence(effect)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.traverse(effect)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(effect)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Effect<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(effect)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(effect)(ta, f)

export const parSequenceRecord = record.sequence(parEffect)

export const parFastSequenceRecord = record.sequence(parFastEffect)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverse(parEffect)(ta, f)

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(parEffect)(ta, f)

export const parFastTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(parFastEffect)(ta, f)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(parEffect)(wa, f)

export const parFastWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(parFastEffect)(wa, f)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(parEffect)(ta, f)

export const parFastWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(parFastEffect)(ta, f)

export const handle = <
  E,
  K extends string & keyof E,
  KK extends string & E[K],
  S2,
  R2,
  E2,
  A2
>(
  k: K,
  kk: KK,
  f: (
    _: Extract<E, { [k in K]: KK }>,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, A2>
) => <S, R, A>(
  _: Effect<S, R, E, A>
): Effect<S | S2, R & R2, Exclude<E, { [k in K]: KK }> | E2, A | A2> =>
  chainError_(_, (e, remaining) => {
    if (k in e) {
      if (e[k] === kk) {
        return f(e as any, remaining) as any
      }
    }
    return completed(
      withRemaining(raise(e), ...(remaining._tag === "Some" ? remaining.value : []))
    )
  })
