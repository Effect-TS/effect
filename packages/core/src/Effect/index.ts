/* adapted from https://github.com/rzeigler/waveguide */

import * as AP from "../Apply"
import * as A from "../Array"
import { filter as filterArray, flatten as flattenArray } from "../Array"
import type {
  Alt4EC,
  CAlt4MAC,
  CApplicative4MA,
  CApplicative4MAC,
  CApplicative4MAP,
  CApplicative4MAPC,
  CMonad4MA,
  CMonad4MAC,
  Monad4E,
  Monad4EC,
  Monad4ECP,
  Monad4EP
} from "../Base"
import type { ATypeOf, ETypeOf, RTypeOf, STypeOf } from "../Base/Apply"
import { Deferred, makeDeferred } from "../Deferred"
import * as D from "../Do"
import * as E from "../Either"
import {
  abort,
  Cause,
  causedBy,
  combinedCause,
  done,
  Exit,
  interrupt,
  interruptWithError,
  raise,
  Interrupt
} from "../Exit"
import { flow, identity } from "../Function"
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function"
import * as Mon from "../Monoid"
import * as O from "../Option"
import { pipe } from "../Pipe"
import * as RE from "../Record"
import { makeRef, Ref } from "../Ref"
import type { Semigroup } from "../Semigroup"
import {
  AsyncCancelContFn,
  EffectURI as URI,
  IAccessEnv,
  IAccessInterruptible,
  IAccessRuntime,
  IChain,
  ICollapse,
  IInterruptibleRegion,
  IMap,
  Instructions,
  IProvideEnv,
  IPure,
  IPureEither,
  IPureOption,
  IPureTag,
  IRaised,
  ISupervised
} from "../Support/Common"
import type {
  Async,
  AsyncE,
  AsyncR,
  AsyncRE,
  Effect,
  Provider,
  Sync,
  SyncE,
  SyncR,
  SyncRE
} from "../Support/Common/effect"
import { DriverImpl } from "../Support/Driver"
import { setExit } from "../Support/Driver/driver"
import { Runtime } from "../Support/Runtime"
import { fst, snd, tuple2 } from "../Support/Utils"
import * as TR from "../Tree"
import type { Erase } from "../Utils"

import {
  applySecond,
  async,
  chain_,
  completed,
  Fiber,
  FiberImpl,
  map_,
  pure,
  pureNone,
  suspended,
  zipWith_,
  sync
} from "./Fiber"

export {
  Async,
  AsyncE,
  AsyncR,
  AsyncRE,
  Effect,
  Provider,
  Sync,
  SyncE,
  SyncR,
  SyncRE
} from "../Support/Common/effect"
export { Env, Erase, Err, Op, Ret } from "../Utils"
export {
  applySecond,
  async,
  chain_,
  completed,
  Fiber,
  FiberImpl,
  map_,
  pure,
  pureNone,
  suspended,
  sync,
  zipWith_
} from "./Fiber"

export function access<R, A>(f: FunctionN<[R], A>): SyncR<R, A> {
  return map_(accessEnvironment<R>(), f)
}

export function accessEnvironment<R>(): SyncR<R, R> {
  return new IAccessEnv() as any
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: Sync<boolean> =
  /*#__PURE__*/
  (() => new IAccessInterruptible(identity) as any)()

export function accessM<S, R, R2, E, A>(
  f: FunctionN<[R], Effect<S, R2, E, A>>
): Effect<S, R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f)
}

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Sync<Runtime> =
  /*#__PURE__*/
  (() => new IAccessRuntime(identity) as any)()

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Async<void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  )
}

export function alt<R2, E2, A>(
  fy: () => AsyncRE<R2, E2, A>
): <R, E, B>(fx: AsyncRE<R, E, B>) => AsyncRE<R & R2, E2, A | B> {
  return (fx) => alt_(fx, fy)
}

export const alt_: <S1, S2, R, R2, E, E2, A, B>(
  fx: Effect<S1, R, E, A>,
  fy: () => Effect<S2, R2, E2, B>
) => Effect<S1 | S2, R & R2, E2, A | B> = chainError_

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

export const ap: <S1, R, E, A>(
  fa: Effect<S1, R, E, A>
) => <S2, R2, E2, B>(
  fab: Effect<S2, R2, E2, (a: A) => B>
) => Effect<S1 | S2, R & R2, E | E2, B> = (fa) => (fab) => ap_(fab, fa)

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
export function ap_<S, R, E, A, B, S2, R2, E2>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(iof, ioa, (f, a) => f(a))
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

export const apFirst: <S1, R, E, B>(
  fb: Effect<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: Effect<S2, R2, E2, A>
) => Effect<S1 | S2, R & R2, E | E2, A> = (fb) => (fa) => applyFirst(fa, fb)

export const apSecond: <S1, R, E, B>(
  fb: Effect<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: Effect<S2, R2, E2, A>
) => Effect<S1 | S2, R & R2, E | E2, B> = (fb) => (fa) => applySecond(fa, fb)

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
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<S, R, E, A, B>(io: Effect<S, R, E, A>, b: B): Effect<S, R, E, B> {
  return map_(io, () => b)
}

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, void> {
  return as(io, undefined)
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
  return async((callback) => op((a) => callback({ _tag: "Right", right: a })))
}

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => <S, R>(fa: Effect<S, R, E, A>) => Effect<S, R, G, B> = (f, g) => (fa) =>
  bimap_(fa, f, g)

export function bimap_<S, R, E1, E2, A, B>(
  io: Effect<S, R, E1, A>,
  leftMap: FunctionN<[E1], E2>,
  rightMap: FunctionN<[A], B>
): Effect<S, R, E2, B> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise" && cause.next._tag === "None"
        ? completed(raise(leftMap(cause.error)))
        : completed(combinedCause(abort("bimap with multiple errors"))(cause)),
    flow(rightMap, pure)
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

export const chain: <S1, R, E, A, B>(
  f: (a: A) => Effect<S1, R, E, B>
) => <S2, R2, E2>(ma: Effect<S2, R2, E2, A>) => Effect<S1 | S2, R & R2, E | E2, B> = (
  bind
) => (inner) =>
  (((inner as any) as Instructions).tag() === IPureTag
    ? bind(((inner as any) as IPure<any>).a)
    : new IChain(inner, bind)) as any

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: Effect<S1, R, E, Effect<S2, R2, E2, A>>
) => Effect<S1 | S2, R & R2, E | E2, A> = (mma) => chain_(mma, (x) => x)

export function chainEither<A, E, B>(
  bind: FunctionN<[A], E.Either<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)))
}

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<S, R, E1, E2, A>(
  f: (_: E1) => Effect<S, R, E2, A>
): <S2, A2, R2>(rio: Effect<S2, R2, E1, A2>) => Effect<S | S2, R & R2, E2, A | A2> {
  return (io) => chainError_(io, f)
}

export function chainError_<S, R, E1, S2, R2, E2, A, A2>(
  io: Effect<S, R, E1, A>,
  f: (_: E1) => Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise" && cause.next._tag === "None"
        ? f(cause.error)
        : completed(combinedCause(abort("chainError with multiple errors"))(cause)),
    pure
  )
}

export function chainCause<S, R, E1, E2, A>(
  f: (_: Cause<E1>) => Effect<S, R, E2, A>
): <S2, A2, R2>(rio: Effect<S2, R2, E1, A2>) => Effect<S | S2, R & R2, E2, A | A2> {
  return (io) => chainCause_(io, f)
}

export function chainCause_<S, R, E1, S2, R2, E2, A, A2>(
  io: Effect<S, R, E1, A>,
  f: (_: Cause<E1>) => Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E2, A | A2> {
  return foldExit_(io, f, pure)
}

export const chainErrorTap = <S, R, E1>(f: (e: E1) => Effect<S, R, never, unknown>) => <
  S2,
  R2,
  A
>(
  io: Effect<S2, R2, E1, A>
) => chainErrorTap_(io, f)

export const chainErrorTap_ = <S, R, E1, S2, R2, A>(
  io: Effect<S, R, E1, A>,
  f: (_: E1) => Effect<S2, R2, never, unknown>
) => chainError_(io, (e) => chain_(f(e), () => completed(raise(e))))

export const chainTap: <S1, R, E, A, B>(
  f: (a: A) => Effect<S1, R, E, B>
) => <S2, R2, E2>(ma: Effect<S2, R2, E2, A>) => Effect<S1 | S2, R & R2, E | E2, A> = (
  f
) => (ma) => chain_(ma, (x) => map_(f(x), () => x))

export function chainOption<E>(
  onEmpty: Lazy<E>
): <A, B>(
  bind: FunctionN<[A], O.Option<B>>
) => <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty))
}

export const chainTap_ = <S, R, E, A, S2, R2, E2>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
): Effect<S | S2, R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a))

export function chainTask<A, B>(
  bind: FunctionN<[A], Lazy<Promise<B>>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)))
}

export function chainTaskEither<A, E, B>(
  bind: FunctionN<[A], Lazy<Promise<E.Either<E, B>>>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)))
}

export function combineFinalizerExit<E, A>(
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
    return combinedCause(fiberExit)(releaseExit)
  }
}

export function inspect<S, R, E, A>(_: Effect<S, R, E, A>) {
  return chain_(result(_), (x) =>
    chain_(
      sync(() => {
        console.log(x)
      }),
      () => completed(x)
    )
  )
}

export function completeLatched<E1, E2, E3, A, B, C, R>(
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

export function cond<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb)
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

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: E.Either<E, A>): SyncE<E, A> {
  return new IPureEither(e) as any
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: O.Option<A>, onError: Lazy<E>): SyncE<E, A> {
  return new IPureOption(o, onError) as any
}

export function fromOption<E>(onError: Lazy<E>): <A>(o: O.Option<A>) => SyncE<E, A> {
  return (o) => new IPureOption(o, onError) as any
}

export function encaseTask<A>(task: () => Promise<A>): Async<A> {
  return orAbort(fromPromise(task))
}

export function encaseTaskEither<E, A>(
  taskEither: Lazy<Promise<E.Either<E, A>>>
): AsyncE<E, A> {
  return async<E, A>((callback) => {
    taskEither().then(callback)
    /* istanbul ignore next */
    return (cb) => {
      cb()
    }
  })
}

export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
    ma: Effect<S, R, E, A>
  ) => Effect<S, R, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
    ma: Effect<S, R, E, A>
  ) => Effect<S, R, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => <S, R>(
  ma: Effect<S, R, E, A>
): Effect<S, R, E, A> =>
  chain_(ma, (a) => (predicate(a) ? completed(raise(onFalse(a))) : completed(done(a))))

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Effect<never, unknown, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
    a: A
  ) => Effect<never, unknown, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (
  a: A
): Effect<never, unknown, E, A> =>
  predicate(a) ? completed(done(a)) : completed(raise(onFalse(a)))

export const flattenEither = <S, R, E, E2, A>(
  eff: Effect<S, R, E, E.Either<E2, A>>
): Effect<S, R, E | E2, A> => chain_(eff, encaseEither)

/**
 * Combines T.chain and T.fromOption
 */
export const flattenOption = <E>(onNone: () => E) => <S, R, E2, A>(
  eff: Effect<S, R, E2, O.Option<A>>
): Effect<S, R, E | E2, A> => chain_(eff, (x) => encaseOption(x, onNone))

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

export const foldExit_: <S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
  inner: Effect<S1, R, E1, A1>,
  failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
  success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
) => Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> = (inner, failure, success) =>
  new ICollapse(inner, failure, success) as any

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
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, never> {
  return chain_(io, () => forever(io))
}

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * @param io
 * @param name
 */
export function fork<S, R, E, A>(
  io: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return makeFiber(io, name)
}

/**
 * Fork the program described by IO in a separate supervised fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function supervised<S, R, E, A>(
  io: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return new ISupervised(io, name) as any
}

export function supervisedRegion<S, R, E, A>(io: Effect<S, R, E, A>) {
  return pipe(
    fork(io),
    chain((f) =>
      asyncTotal<Exit<E, A>>((res) => {
        const cancel = run(f.join, res)

        return (cb) => {
          cancel((ex) => {
            cb(setExit(ex))
          })
        }
      })
    ),
    chain(completed)
  )
}

export function fromNullableM<S, R, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R, E, O.Option<NonNullable<A>>> {
  return map_(ma, O.fromNullable)
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

export function getCauseSemigroup<E>(S: Semigroup<E>): Semigroup<Cause<E>> {
  return {
    concat: (ca, cb): Cause<E> => {
      if (
        ca._tag === "Raise" &&
        cb._tag === "Raise" &&
        ca.next._tag === "None" &&
        cb.next._tag === "None"
      ) {
        return raise(S.concat(ca.error, cb.error))
      }

      return combinedCause(ca)(cb)
    }
  }
}

export function getCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): CMonad4MAC<URI, E> & CAlt4MAC<URI, E> & CApplicative4MAC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map,
    chain,
    ap: <S2, R2, A>(
      fa: Effect<S2, R2, E, A>
    ): (<S1, R, B>(
      fab: Effect<S1, R, E, (a: A) => B>
    ) => Effect<S1 | S2, R & R2, E, B>) => (fab) =>
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
    alt: <S2, R2, A>(
      fb: () => Effect<S2, R2, E, A>
    ): (<S1, R, B>(fa: Effect<S1, R, E, B>) => Effect<S1 | S2, R & R2, E, A | B>) => (
      fa
    ) =>
      foldExit_(
        fa,
        (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure),
        pure
      )
  }
}

export function getMonoid<S, R, E, A>(
  m: Mon.Monoid<A>
): Mon.Monoid<Effect<S, R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  }
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

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S))
}

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
    _: Extract<
      E,
      {
        [k in K]: KK
      }
    >
  ) => Effect<S2, R2, E2, A2>
) => <S, R, A>(
  _: Effect<S, R, E, A>
): Effect<
  S | S2,
  R & R2,
  | Exclude<
      E,
      {
        [k in K]: KK
      }
    >
  | E2,
  A | A2
> =>
  chainError_(_, (e) => {
    if (k in e) {
      if (e[k] === kk) {
        return f(e as any) as any
      }
    }
    return completed(raise(e))
  })

export const makeHandle = <K extends string>(k: K) => <
  E extends { [k in K]: any },
  KK extends string & E[K],
  S2,
  R2,
  E2,
  A2
>(
  kk: KK,
  f: (
    _: Extract<
      E,
      {
        [k in K]: KK
      }
    >
  ) => Effect<S2, R2, E2, A2>
) => handle<E, K, KK, S2, R2, E2, A2>(k, kk, f)

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return interruptibleRegion(io, true)
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

export function interruptLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return chain_(loser.interrupt, (x) =>
    x._tag === "Interrupt" && x.errors._tag === "Some" ? completed(x) : completed(exit)
  )
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<S, R, E, A> = FunctionN<
  [Effect<S, R, E, A>],
  Effect<S, R, E, A>
>

export function makeInterruptMaskCutout<S, R, E, A>(
  state: boolean
): InterruptMaskCutout<S, R, E, A> {
  return (inner) => interruptibleRegion(inner, state)
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

/**
 * Curried form of delay
 */
export function liftDelay(
  ms: number
): <S, R, E, A>(io: Effect<S, R, E, A>) => AsyncRE<R, E, A> {
  return (io) => delay(io, ms)
}

export function liftEither<A, E, B>(
  f: FunctionN<[A], E.Either<E, B>>
): FunctionN<[A], SyncE<E, B>> {
  return (a) => suspended(() => encaseEither(f(a)))
}

export function liftOption<E>(
  onNone: () => E
): <A, B>(f: FunctionN<[A], O.Option<B>>) => FunctionN<[A], SyncE<E, B>> {
  return (f) => (a) => suspended(() => encaseOption(f(a), onNone))
}

export const left = <E>(_: E): E.Either<E, never> => ({
  _tag: "Left",
  left: _
})

export const right = <A>(_: A): E.Either<never, A> => ({
  _tag: "Right",
  right: _
})

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

export const map: <A, B>(
  f: (a: A) => B
) => <S, R, E>(fa: Effect<S, R, E, A>) => Effect<S, R, E, B> = (f) => (base) =>
  (((base as any) as Instructions).tag() === IPureTag
    ? new IPure(f(((base as any) as IPure<any>).a))
    : new IMap(base, f)) as any

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: FunctionN<[E1], E2>
): <S, R, A>(io: Effect<S, R, E1, A>) => Effect<S, R, E2, A> {
  return (io) => mapLeft_(io, f)
}

export const mapLeft_: <S, R, E, A, G>(
  fea: Effect<S, R, E, A>,
  f: (e: E) => G
) => Effect<S, R, G, A> = (io, f) => chainError_(io, (x) => completed(raise(f(x))))

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Async<never> =
  /*#__PURE__*/
  (() =>
    asyncTotal(() => {
      const handle = setInterval(() => {
        //
      }, 60000)
      /* istanbul ignore next */
      return (cb) => {
        clearInterval(handle)
        cb()
      }
    }))() as any

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
export function onComplete_<S, R, E, A, S2, R2, E2>(
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

export function onInterrupted<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onInterrupted_(ioa, finalizer)
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
export function onInterrupted_<S, R, E, A, S2, R2, E2>(
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

export function onInterruptedExit_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: (_: Interrupt) => Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer(exit)), (finalize) =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  )
}

export function or_(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => Effect<S | S2, R & R2, E | E2, E.Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, left) : map_(mb, right))
}

export function or<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, E.Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, left) : map_(mb, right))
}

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, never, A> {
  return chainError_(io, (e) => completed(abort(e)))
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
  return parZipWith_(iof, ioa, (f, a) => f(a))
}

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<S, R, E, A>(
  ioa: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
) => AsyncRE<R & R2, E | E2, B> {
  return (iof) => parZipWith_(iof, ioa, (f, a) => f(a))
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
  return parZipWith_(ioa, iob, fst)
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
  return parZipWith_(ioa, iob, snd)
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
  return parFastZipWith_(iof, ioa, (f, a) => f(a))
}

/**
 * Parallel form of ap
 * Interrupt at first error
 * @param ioa
 * @param iof
 */
export function parFastAp<S, R, E, A>(
  ioa: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
) => AsyncRE<R & R2, E | E2, B> {
  return (iof) => parFastZipWith_(iof, ioa, (f, a) => f(a))
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
  return parFastZipWith_(ioa, iob, fst)
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
  return parFastZipWith_(ioa, iob, snd)
}

/**
 * Tuple the result of 2 ios executed in parallel
 * Interrupt at first error
 * @param ioa
 * @param iob
 */
export function parFastZip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(first: Effect<S, R, E, A>) => AsyncRE<R & R2, E | E2, readonly [A, B]> {
  return parFastZipWith(second, tuple2)
}

export function parFastZip_<S, S2, R, R2, E, E2, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, readonly [A, B]> {
  return parZipWith_(ioa, iob, tuple2)
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * Interrupt at first failure returning the error
 * @param ioa
 * @param iob
 * @param f
 */
export function parFastZipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => AsyncRE<R & R2, E | E2, C> {
  return (first) => parFastZipWith_(first, second, f)
}

export function parFastZipWith_<S, S2, R, R2, E, E2, A, B, C>(
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
                  x._tag === "Interrupt" && x.errors._tag === "Some"
                    ? aExit._tag === "Raise" || aExit._tag === "Abort"
                      ? completed(causedBy(aExit)(x))
                      : completed(x)
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
                  x._tag === "Interrupt" && x.errors._tag === "Some"
                    ? bExit._tag === "Raise" || bExit._tag === "Abort"
                      ? completed(causedBy(bExit)(x))
                      : completed(x)
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
export function parZip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(first: Effect<S, R, E, A>) => AsyncRE<R & R2, E | E2, readonly [A, B]> {
  return parZipWith(second, tuple2)
}

export function parZip_<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, readonly [A, B]> {
  return parZipWith_(ioa, iob, tuple2)
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => AsyncRE<R & R2, E | E2, C> {
  return (first) =>
    raceFold(
      first,
      second,
      (aExit, bFiber) => zipWith_(completed(aExit), bFiber.join, f),
      (bExit, aFiber) => zipWith_(aFiber.join, completed(bExit), f)
    )
}

export function parZipWith_<S, S2, R, R2, E, E2, A, B, C>(
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

export const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R2, E, A> => accessM((r2: R2) => new IProvideEnv(ma, f(r2)) as any)

export const provideWith = <R, A>(
  f: (_: R) => A,
  _: "regular" | "inverted" = "regular"
): Provider<R, A, never, never> => provideM(access(f), _)

export const provideWithM = <R2, S, R, E, A>(
  f: (_: R2) => Effect<S, R, E, A>,
  _: "regular" | "inverted" = "regular"
): Provider<R & R2, A, E, S> => provideM(accessM(f), _)

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
function fallbackToLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return exit._tag === "Done" ? interruptLoser(exit, loser) : loser.join
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

export function combineInterruptExit<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, [Exit<any, any>, Exit<any, any>]>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [
                  ...(exit.errors._tag === "Some" ? exit.errors.value : []),
                  ...flattenArray(
                    finalize.value.map((x) =>
                      x._tag === "Interrupt"
                        ? x.errors._tag === "Some"
                          ? x.errors.value
                          : []
                        : []
                    )
                  )
                ],
                filterArray((x): x is unknown => x !== undefined)
              )

              const exCausedBy = exit.causedBy
              const finalACausedBy =
                finalize.value[0]._tag === "Interrupt"
                  ? finalize.value[0].causedBy
                  : O.none
              const finalBCausedBy =
                finalize.value[1]._tag === "Interrupt"
                  ? finalize.value[1].causedBy
                  : O.none

              const caused = Mon.fold(O.getFirstMonoid<Cause<unknown>>())([
                exCausedBy,
                finalACausedBy,
                finalBCausedBy
              ])

              let ex: Cause<E> =
                errors.length > 0
                  ? caused._tag === "Some"
                    ? causedBy(caused.value)(interruptWithError(...errors))
                    : interruptWithError(...errors)
                  : exit

              if (
                finalize.value[0]._tag === "Raise" ||
                finalize.value[0]._tag === "Abort"
              ) {
                ex = combinedCause(ex)(finalize.value[0])
              }

              if (
                finalize.value[1]._tag === "Raise" ||
                finalize.value[1]._tag === "Abort"
              ) {
                ex = combinedCause(ex)(finalize.value[1])
              }

              return completed(ex)
            } else {
              throw new Error("BUG: interrupt finalizer should not fail")
            }
          })
        : completed(exit)
    )
  )
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
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Sync<never> {
  return raised(abort(u))
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
 * An IO that is already interrupted
 */
export const raiseInterrupt: Sync<never> =
  /*#__PURE__*/
  (() => raised(interrupt))() as any

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
  return new DriverImpl<E, A>().startSync(io)
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
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shifted)
}

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shiftedAsync)
}

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shiftedAsync, io)
}

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shifted, io)
}

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: Async<void> =
  /*#__PURE__*/
  (() =>
    uninterruptible(
      chain_(accessRuntime, (runtime) =>
        asyncTotal<void>((callback) => {
          runtime.dispatch(callback, undefined)
          return (cb) => {
            cb()
          }
        })
      )
    ))()

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Async<void> =
  /*#__PURE__*/
  (() =>
    uninterruptible(
      chain_(accessRuntime, (runtime) =>
        asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
      )
    ))()

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
): AsyncRE<R, E, O.Option<A>> {
  return timeoutFold(
    source,
    ms,
    (actionFiber) => applySecond(actionFiber.interrupt, pureNone),
    (exit) => map_(completed(exit), O.some)
  )
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
 * An IO that succeeds immediately with void
 */
export const unit: Sync<void> =
  /*#__PURE__*/
  (() => pure(undefined))()

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

export function when(
  predicate: boolean
): <S, R, E, A>(ma: Effect<S, R, E, A>) => Effect<S, R, E, O.Option<A>> {
  return (ma) => (predicate ? map_(ma, O.some) : pure(O.none))
}

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */

export function withRuntime<S, R, E, A>(
  f: FunctionN<[Runtime], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessRuntime, f)
}

export function zip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(
  first: Effect<S, R, E, A>
) => Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return (first) => chain_(first, (x) => map_(second, (y) => [x, y]))
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
export function zip_<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith_(first, second, tuple2)
}

export function zipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => Effect<S | S2, R & R2, E | E2, C> {
  return (first) => zipWith_(first, second, f)
}

/**
 * Used to merge types of the form Effect<S, R, E, A> | Effect<S2, R2, E2, A2> into Effect<S | S2, R & R2, E | E2, A | A2>
 * @param _
 */
export function compact<H extends Effect<any, any, any, any>>(
  _: H
): Effect<STypeOf<H>, RTypeOf<H>, ETypeOf<H>, ATypeOf<H>> {
  return _ as any
}

export const effect: CMonad4MA<URI> & CApplicative4MA<URI> = {
  URI,
  map,
  of: pure,
  ap,
  chain
}

export function par<I, E>(
  I: CApplicative4MAC<URI, E> & I
): CApplicative4MAPC<URI, E> & Erase<I, CApplicative4MAC<URI, E>>
export function par<I>(
  I: CApplicative4MA<URI> & I
): CApplicative4MAP<URI> & Erase<I, CApplicative4MA<URI>>
export function par<I>(I: CApplicative4MA<URI> & I): CApplicative4MAP<URI> & I {
  return {
    ...I,
    _CTX: "async",
    ap: (fa) => (fab) =>
      chain_(parZip_(result(fab), result(fa)), (r) =>
        I.ap(completed(r[1]))(completed(r[0]))
      )
  }
}

export function parFast<I>(
  I: CApplicative4MA<URI> & I
): CApplicative4MAP<URI> & Erase<I, CApplicative4MA<URI>>
export function parFast<I>(I: CApplicative4MA<URI> & I): CApplicative4MAP<URI> & I {
  return {
    ...I,
    _CTX: "async",
    ap: parFastAp
  }
}

// region classic

export const Do = () => D.Do(effect)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(effect))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(effect))()

export const sequenceArray =
  /*#__PURE__*/
  (() => A.sequence(effect))()

export const sequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(effect))()

export const sequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(effect))()

export const sequenceOption =
  /*#__PURE__*/
  (() => O.sequence(effect))()

export const sequenceEither =
  /*#__PURE__*/
  (() => E.sequence(effect))()

export const traverseArray =
  /*#__PURE__*/
  (() => A.traverse(effect))()

export const traverseArray_ =
  /*#__PURE__*/
  (() => A.traverse_(effect))()

export const traverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(effect))()

export const traverseRecord_ =
  /*#__PURE__*/
  (() => RE.traverse_(effect))()

export const traverseTree =
  /*#__PURE__*/
  (() => TR.traverse(effect))()

export const traverseTree_ =
  /*#__PURE__*/
  (() => TR.traverse_(effect))()

export const traverseOption =
  /*#__PURE__*/
  (() => O.traverse(effect))()

export const traverseOption_ =
  /*#__PURE__*/
  (() => O.traverse_(effect))()

export const traverseEither =
  /*#__PURE__*/
  (() => E.traverse(effect))()

export const traverseEither_ =
  /*#__PURE__*/
  (() => E.traverse_(effect))()

export const traverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(effect))()

export const traverseArrayWI_ =
  /*#__PURE__*/
  (() => A.traverseWithIndex_(effect))()

export const traverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(effect))()

export const traverseRecordWI_ =
  /*#__PURE__*/
  (() => RE.traverseWithIndex_(effect))()

export const witherArray =
  /*#__PURE__*/
  (() => A.wither(effect))()

export const witherArray_ =
  /*#__PURE__*/
  (() => A.wither_(effect))()

export const witherRecord =
  /*#__PURE__*/
  (() => RE.wither(effect))()

export const witherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(effect))()

export const witherOption =
  /*#__PURE__*/
  (() => O.wither(effect))()

export const witherOption_ =
  /*#__PURE__*/
  (() => O.wither_(effect))()

export const wiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(effect))()

export const wiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(effect))()

export const wiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(effect))()

export const wiltOption =
  /*#__PURE__*/
  (() => O.wilt(effect))()

export const wiltOption_ =
  /*#__PURE__*/
  (() => O.wilt_(effect))()

// region parallel

export const parDo = () => D.Do(par(effect))

export const parSequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(par(effect)))()

export const parSequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(par(effect)))()

export const parSequenceArray =
  /*#__PURE__*/
  (() => A.sequence(par(effect)))()

export const parSequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(par(effect)))()

export const parSequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(par(effect)))()

export const parTraverseArray =
  /*#__PURE__*/
  (() => A.traverse(par(effect)))()

export const parTraverseArray_ =
  /*#__PURE__*/
  (() => A.traverse_(par(effect)))()

export const parTraverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(par(effect)))()

export const parTraverseRecord_ =
  /*#__PURE__*/
  (() => RE.traverse_(par(effect)))()

export const parTraverseTree =
  /*#__PURE__*/
  (() => TR.traverse(par(effect)))()

export const parTraverseTree_ =
  /*#__PURE__*/
  (() => TR.traverse_(par(effect)))()

export const parWitherArray =
  /*#__PURE__*/
  (() => A.wither(par(effect)))()

export const parWitherArray_ =
  /*#__PURE__*/
  (() => A.wither_(par(effect)))()

export const parWitherRecord =
  /*#__PURE__*/
  (() => RE.wither(par(effect)))()

export const parWitherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(par(effect)))()

export const parWiltArray =
  /*#__PURE__*/
  (() => A.wilt(par(effect)))()

export const parWiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(par(effect)))()

export const parWiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(par(effect)))()

export const parWiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(par(effect)))()

export const parTraverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(par(effect)))()

export const parTraverseArrayWI_ =
  /*#__PURE__*/
  (() => A.traverseWithIndex_(par(effect)))()

export const parTraverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(par(effect)))()

export const parTraverseRecordWI_ =
  /*#__PURE__*/
  (() => RE.traverseWithIndex_(par(effect)))()

// region parallel fast

export const parFastDo = () => D.Do(parFast(effect))

export const parFastSequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(parFast(effect)))()

export const parFastSequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(parFast(effect)))()

export const parFastSequenceArray =
  /*#__PURE__*/
  (() => A.sequence(parFast(effect)))()

export const parFastSequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(parFast(effect)))()

export const parFastSequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(parFast(effect)))()

export const parFastTraverseArray =
  /*#__PURE__*/
  (() => A.traverse(parFast(effect)))()

export const parFastTraverseArray_ =
  /*#__PURE__*/
  (() => A.traverse_(parFast(effect)))()

export const parFastTraverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(parFast(effect)))()

export const parFastTraverseRecord_ =
  /*#__PURE__*/
  (() => RE.traverse_(parFast(effect)))()

export const parFastTraverseTree =
  /*#__PURE__*/
  (() => TR.traverse(parFast(effect)))()

export const parFastTraverseTree_ =
  /*#__PURE__*/
  (() => TR.traverse_(parFast(effect)))()

export const parFastWitherArray =
  /*#__PURE__*/
  (() => A.wither(parFast(effect)))()

export const parFastWitherArray_ =
  /*#__PURE__*/
  (() => A.wither_(parFast(effect)))()

export const parFastWitherRecord =
  /*#__PURE__*/
  (() => RE.wither(parFast(effect)))()

export const parFastWitherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(parFast(effect)))()

export const parFastWiltArray =
  /*#__PURE__*/
  (() => A.wilt(parFast(effect)))()

export const parFastWiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(parFast(effect)))()

export const parFastWiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(parFast(effect)))()

export const parFastWiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(parFast(effect)))()

export const parFastTraverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(parFast(effect)))()

export const parFastTraverseArrayWI_ =
  /*#__PURE__*/
  (() => A.traverseWithIndex_(parFast(effect)))()

export const parFastTraverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(parFast(effect)))()

export const parFastTraverseRecordWI_ =
  /*#__PURE__*/
  (() => RE.traverseWithIndex_(parFast(effect)))()

//
// Compatibility with fp-ts ecosystem
//

export const effect_: Monad4E<URI> = {
  URI,
  ap: ap_,
  chain: chain_,
  map: map_,
  of: pure
}

export const effectPar_: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  ap: parAp_,
  chain: chain_,
  map: map_,
  of: pure
}

export const effectParFast_: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  ap: parFastAp_,
  chain: chain_,
  map: map_,
  of: pure
}

export function getCauseValidationM_<E>(
  S: Semigroup<Cause<E>>
): Monad4EC<URI, E> & Alt4EC<URI, E> {
  const cv = getCauseValidationM(S)
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, R, B, S2, R2, A>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, B> => cv.ap(fa)(fab),
    alt: <S1, R, B, S2, R2, A>(
      fa: Effect<S1, R, E, B>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A | B> => cv.alt(fb)(fa)
  }
}

export function getParCauseValidationM_<E>(
  S: Semigroup<Cause<E>>
): Monad4ECP<URI, E> & Alt4EC<URI, E> {
  const cv = par(getCauseValidationM(S))
  return {
    URI,
    _CTX: "async",
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, R, B, S2, R2, A>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<unknown, R & R2, E, B> => cv.ap(fa)(fab),
    alt: <S1, R, B, S2, R2, A>(
      fa: Effect<S1, R, E, B>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A | B> => cv.alt(fb)(fa)
  }
}
