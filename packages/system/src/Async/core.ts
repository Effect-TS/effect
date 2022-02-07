// ets_tracing: off

/* eslint-disable prefer-const */
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { _A, _E, _R, _U } from "../Effect/commons.js"
import * as E from "../Either/index.js"
import { pipe } from "../Function/index.js"
import type { Option } from "../Option/index.js"
import { Stack } from "../Stack/index.js"
import type * as U from "../Utils/index.js"

/**
 * `Async[R, E, A]` is a purely functional description of an async computation
 * that requires an environment `R` and may either  fail with an `E` or succeed
 * with an `A`.
 */
export interface Async<R, E, A> extends U.HasUnify {}
export abstract class Async<R, E, A> {
  readonly [_U]!: "Async";
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void
}

export interface UIO<A> extends Async<unknown, never, A> {}
export interface RIO<R, A> extends Async<R, never, A> {}
export interface IO<E, A> extends Async<unknown, E, A> {}

/**
 * @ets_optimize identity
 */
function concrete<R, E, A>(_: Async<R, E, A>): Concrete<R, E, A> {
  return _ as any
}

class ISucceed<A> extends Async<unknown, never, A> {
  readonly _asyncTag = "Succeed"

  constructor(readonly a: A) {
    super()
  }
}

class ISuspend<R, E, A> extends Async<R, E, A> {
  readonly _asyncTag = "Suspend"

  constructor(readonly f: () => Async<R, E, A>) {
    super()
  }
}

class IFail<E> extends Async<unknown, E, never> {
  readonly _asyncTag = "Fail"

  constructor(readonly e: E) {
    super()
  }
}

class IFlatMap<R, R1, E, E1, A, B> extends Async<R & R1, E1 | E, B> {
  readonly _asyncTag = "FlatMap"

  constructor(
    readonly value: Async<R, E, A>,
    readonly cont: (a: A) => Async<R1, E1, B>
  ) {
    super()
  }
}

class IFold<R, E1, E2, A, B> extends Async<R, E2, B> {
  readonly _asyncTag = "Fold"

  constructor(
    readonly value: Async<R, E1, A>,
    readonly failure: (e: E1) => Async<R, E2, B>,
    readonly success: (a: A) => Async<R, E2, B>
  ) {
    super()
  }
}

class IAccess<R, E, A> extends Async<R, E, A> {
  readonly _asyncTag = "Access"

  constructor(readonly access: (r: R) => Async<R, E, A>) {
    super()
  }
}

class IProvide<R, E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "Provide"

  constructor(readonly r: R, readonly cont: Async<R, E, A>) {
    super()
  }
}

class IPromise<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "Promise"

  constructor(
    readonly promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly onError: (u: unknown) => E
  ) {
    super()
  }
}

class IDone<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "Done"

  constructor(readonly exit: Exit<E, A>) {
    super()
  }
}

type Concrete<R, E, A> =
  | ISucceed<A>
  | IFail<E>
  | IFlatMap<R, R, E, E, unknown, A>
  | IFold<R, unknown, E, unknown, A>
  | IAccess<R, E, A>
  | IProvide<R, E, A>
  | ISuspend<R, E, A>
  | IPromise<E, A>
  | IDone<E, A>

class FoldFrame {
  readonly _asyncTag = "FoldFrame"
  constructor(
    readonly failure: (e: any) => Async<any, any, any>,
    readonly apply: (e: any) => Async<any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _asyncTag = "ApplyFrame"
  constructor(readonly apply: (e: any) => Async<any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame

/**
 * Models the state of interruption, allows for listening to interruption events & firing interruption events
 */
export class InterruptionState {
  private isInterrupted = false
  readonly listeners = new Set<() => void>()

  // listen to an interruption event
  listen(f: () => void) {
    this.listeners.add(f)
    return () => {
      // stop listening
      this.listeners.delete(f)
    }
  }

  get interrupted() {
    return this.isInterrupted
  }

  interrupt() {
    if (!this.isInterrupted) {
      // set to interrupted
      this.isInterrupted = true
      // notify
      this.listeners.forEach((i) => {
        i()
      })
    }
  }
}

export interface Failure<E> {
  readonly _tag: "Failure"
  e: E
}

export interface Interrupt {
  readonly _tag: "Interrupt"
}

export interface Success<A> {
  readonly _tag: "Success"
  a: A
}

export type Rejection<E> = Failure<E> | Interrupt

export type Exit<E, A> = Rejection<E> | Success<A>

export const failExit = <E>(e: E): Rejection<E> => ({
  _tag: "Failure",
  e
})

export const interruptExit = <Exit<never, never>>{
  _tag: "Interrupt"
}

export const successExit = <A>(a: A): Exit<never, A> => ({
  _tag: "Success",
  a
})

/**
 * Models a cancellable promise
 */
class CancelablePromise<E, A> {
  // holds the type information of E
  readonly _E!: () => E

  // gets called with a Rejection<E>, any here is to not break covariance imposed by _E
  private rejection: ((e: Rejection<any>) => void) | undefined = undefined

  // holds the current running promise
  private current: Promise<A> | undefined = undefined

  constructor(
    // creates the promise
    readonly promiseFactory: (onInterrupt: (f: () => void) => void) => Promise<A>,
    // listens for interruption events
    readonly is: InterruptionState
  ) {}

  // creates the computation linking it to the interruption state
  readonly promise: () => Promise<A> = () => {
    if (this.current) {
      throw new Error("Bug: promise() have been called twice")
    } else if (this.is.interrupted) {
      throw new Error("Bug: trying to create a promise already interrupted")
    } else {
      const onInterrupt = <(() => void)[]>[]
      // we record the current interrupt in the interruption registry
      const removeListener = this.is.listen(() => {
        onInterrupt.forEach((f) => {
          f()
        })
        this.interrupt()
      })
      const p = new Promise<A>((res, rej) => {
        // set the rejection handler
        this.rejection = rej

        // creates the underlying promise
        this.promiseFactory((f) => {
          onInterrupt.push(f)
        })
          .then((a) => {
            // removes the call to interrupt from the interruption registry
            removeListener()
            // if not interrupted we continue
            if (!this.is.interrupted) {
              res(a)
            }
          })
          .catch((e) => {
            // removes the call to interrupt from the interruption registry
            removeListener()
            // if not interrupted we continue
            if (!this.is.interrupted) {
              rej(e)
            }
          })
      })
      // track the current running promise to avoid re-creation
      this.current = p

      // return the promise
      return p
    }
  }

  readonly interrupt = () => {
    // triggeres a promise rejection on the current promise with an interrupt exit
    this.rejection?.(interruptExit as any)
  }
}

export class Tracer {
  private running = new Set<Promise<any>>()

  constructor() {
    this.traced = this.traced.bind(this)
    this.wait = this.wait.bind(this)
    this.clear = this.clear.bind(this)
  }

  // tracks a lazy promise lifetime
  traced<A>(promise: () => Promise<A>) {
    return async () => {
      const p = promise()
      this.running.add(p)

      try {
        const a = await p
        this.running.delete(p)
        return Promise.resolve(a)
      } catch (e) {
        this.running.delete(p)
        return Promise.reject(e)
      }
    }
  }

  // awaits for all the running promises to complete
  async wait(): Promise<Exit<any, any>[]> {
    const t = await Promise.all(
      Array.from(this.running).map((p) =>
        p.then((a) => successExit(a)).catch((e) => Promise.resolve(e))
      )
    )
    return await new Promise((r) => {
      setTimeout(() => {
        r(t)
      }, 0)
    })
  }

  // clears itself
  clear() {
    this.running.clear()
  }
}

// create the root tracing context
export const tracingContext = new Tracer()

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runPromiseExitEnv<R, E, A>(
  self: Async<R, E, A>,
  ri: R,
  is: InterruptionState = new InterruptionState()
): Promise<Exit<E, A>> {
  return tracingContext.traced(async () => {
    let stack: Stack<Frame> | undefined = undefined
    let a = null
    let r = ri
    let failed = false
    let curAsync = self as Async<any, any, any> | undefined
    let cnt = 0
    let interruptedLocal = false

    function isInterruted() {
      return interruptedLocal || is.interrupted
    }

    function pop() {
      const nextInstr = stack
      if (nextInstr) {
        stack = stack?.previous
      }
      return nextInstr?.value
    }

    function push(cont: Frame) {
      stack = new Stack(cont, stack)
    }

    function findNextErrorHandler() {
      let unwinding = true
      while (unwinding) {
        const nextInstr = pop()

        if (nextInstr == null) {
          unwinding = false
        } else {
          if (nextInstr._asyncTag === "FoldFrame") {
            unwinding = false
            push(new ApplyFrame(nextInstr.failure))
          }
        }
      }
    }

    while (curAsync != null && !isInterruted()) {
      if (cnt > 10_000) {
        await new Promise((r) => {
          setTimeout(() => {
            r(undefined)
          }, 0)
        })
        cnt = 0
      }
      cnt += 1

      const xp = concrete(curAsync)

      switch (xp._asyncTag) {
        case "FlatMap": {
          const nested = concrete(xp.value)
          const continuation = xp.cont

          switch (nested._asyncTag) {
            case "Succeed": {
              curAsync = continuation(nested.a)
              break
            }
            default: {
              curAsync = nested
              push(new ApplyFrame(continuation))
            }
          }

          break
        }
        case "Suspend": {
          curAsync = xp.f()
          break
        }
        case "Succeed": {
          a = xp.a
          const nextInstr = pop()
          if (nextInstr) {
            curAsync = nextInstr.apply(a)
          } else {
            curAsync = undefined
          }
          break
        }
        case "Fail": {
          findNextErrorHandler()
          const nextInst = pop()
          if (nextInst) {
            curAsync = nextInst.apply(xp.e)
          } else {
            failed = true
            a = xp.e
            curAsync = undefined
          }
          break
        }
        case "Fold": {
          curAsync = xp.value
          push(new FoldFrame(xp.failure, xp.success))
          break
        }
        case "Done": {
          switch (xp.exit._tag) {
            case "Failure": {
              curAsync = new IFail(xp.exit.e)
              break
            }
            case "Interrupt": {
              interruptedLocal = true
              curAsync = undefined
              break
            }
            case "Success": {
              curAsync = new ISucceed(xp.exit.a)
              break
            }
          }
          break
        }
        case "Access": {
          curAsync = xp.access(r)
          break
        }
        case "Provide": {
          r = xp.r
          curAsync = xp.cont
          break
        }
        case "Promise": {
          try {
            curAsync = new ISucceed(
              await new CancelablePromise(
                (s) =>
                  xp.promise(s).catch((e) => Promise.reject(failExit(xp.onError(e)))),
                is
              ).promise()
            )
          } catch (e) {
            const e_ = <Rejection<E>>e

            switch (e_._tag) {
              case "Failure": {
                curAsync = new IFail(e_.e)
                break
              }
              case "Interrupt": {
                interruptedLocal = true
                curAsync = undefined
                break
              }
            }
          }
          break
        }
      }
    }

    if (is.interrupted) {
      return interruptExit
    }

    if (failed) {
      return failExit(a)
    }

    return successExit(a)
  })()
}

export function runPromiseExit<E, A>(
  self: Async<unknown, E, A>,
  is: InterruptionState = new InterruptionState()
): Promise<Exit<E, A>> {
  return runPromiseExitEnv(self, {}, is)
}

// runs as a Promise of an Exit
export async function runPromise<E, A>(
  task: Async<unknown, E, A>,
  is = new InterruptionState()
): Promise<A> {
  return runPromiseExit(task, is).then((e) =>
    e._tag === "Failure"
      ? Promise.reject(e.e)
      : e._tag === "Interrupt"
      ? Promise.reject(e)
      : Promise.resolve(e.a)
  )
}

// runs as a Cancellable
export function runAsync<E, A>(
  task: Async<unknown, E, A>,
  cb?: (e: Exit<E, A>) => void
) {
  const is = new InterruptionState()
  runPromiseExit(task, is).then(cb)
  return () => {
    is.interrupt()
  }
}

// runs as a Cancellable
export function runAsyncEnv<R, E, A>(
  task: Async<R, E, A>,
  r: R,
  cb?: (e: Exit<E, A>) => void
) {
  const is = new InterruptionState()
  runPromiseExitEnv(task, r, is).then(cb)
  return () => {
    is.interrupt()
  }
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain_
 */
export function chain<A, R1, E1, B>(f: (a: A) => Async<R1, E1, B>) {
  return <R, E>(self: Async<R, E, A>): Async<R & R1, E | E1, B> => new IFlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain_<R, E, A, R1, E1, B>(
  self: Async<R, E, A>,
  f: (a: A) => Async<R1, E1, B>
): Async<R & R1, E | E1, B> {
  return new IFlatMap(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @ets_data_first tap_
 */
export function tap<A, R1, E1, X>(f: (a: A) => Async<R1, E1, X>) {
  return <R, E>(self: Async<R, E, A>): Async<R & R1, E | E1, A> => tap_(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export function tap_<R, E, A, R1, E1, X>(
  self: Async<R, E, A>,
  f: (a: A) => Async<R1, E1, X>
): Async<R & R1, E | E1, A> {
  return chain_(self, (a) => map_(f(a), () => a))
}

/**
 * Constructs a computation that always succeeds with the specified value.
 */
export function succeed<A>(a: A): Async<unknown, never, A> {
  return new ISucceed(a)
}

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export function fail<E>(a: E): Async<unknown, E, never> {
  return new IFail(a)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function map_<R, E, A, B>(self: Async<R, E, A>, f: (a: A) => B) {
  return chain_(self, (a) => succeed(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Async<R, E, A>) => map_(self, f)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: Async<R, E, A>,
  failure: (e: E) => Async<R1, E1, B>,
  success: (a: A) => Async<R2, E2, C>
): Async<R & R1 & R2, E1 | E2, B | C> {
  return new IFold(
    self as Async<R & R1 & R2, E, A>,
    failure as (e: E) => Async<R1 & R2, E1 | E2, B | C>,
    success
  )
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @ets_data_first foldM_
 */
export function foldM<E, A, R1, E1, B, R2, E2, C>(
  failure: (e: E) => Async<R1, E1, B>,
  success: (a: A) => Async<R2, E2, C>
) {
  return <R>(self: Async<R, E, A>) => foldM_(self, failure, success)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, B, C>(failure: (e: E) => B, success: (a: A) => C) {
  return <R>(self: Async<R, E, A>) => fold_(self, failure, success)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or righr function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  self: Async<R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => C
): Async<R, never, B | C> {
  return foldM_(
    self,
    (e) => succeed(failure(e)),
    (a) => succeed(success(a))
  )
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R1, E1, B>(failure: (e: E) => Async<R1, E1, B>) {
  return <R, A>(self: Async<R, E, A>) => catchAll_(self, failure)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: Async<R, E, A>,
  failure: (e: E) => Async<R1, E1, B>
) {
  return foldM_(self, failure, (a) => succeed(a))
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @ets_data_first bimap_
 */
export function bimap<E, A, E1, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Async<R, E, A>) => bimap_(self, f, g)
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, A1>(
  self: Async<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
) {
  return foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeed(() => g(a))
  )
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Async<R, E, A>) => mapError_(self, f)
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export function mapError_<R, E, A, E1>(self: Async<R, E, A>, f: (e: E) => E1) {
  return catchAll_(self, (e) => fail(f(e)))
}

/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 */
export const unit = succeed<void>(undefined)

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 */
export function provideSome<R0, R1>(f: (s: R0) => R1) {
  return <E, A>(self: Async<R1, E, A>) => accessM((r: R0) => provideAll(f(r))(self))
}

/**
 * Provides this computation with its required environment.
 *
 * @ets_data_first provideAll_
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: Async<R, E, A>): Async<unknown, E, A> => new IProvide(r, self)
}

/**
 * Provides this computation with its required environment.
 */
export function provideAll_<R, E, A>(self: Async<R, E, A>, r: R): Async<unknown, E, A> {
  return new IProvide(r, self)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide<R = unknown>(r: R) {
  return <E, A, R0 = unknown>(next: Async<R & R0, E, A>): Async<R0, E, A> =>
    provideSome((r0: R0) => ({ ...r0, ...r }))(next)
}

/**
 * Access the environment monadically
 */
export function accessM<R, R1, E, A>(
  f: (_: R) => Async<R1, E, A>
): Async<R1 & R, E, A> {
  return new IAccess<R1 & R, E, A>(f)
}

/**
 * Access the environment with the function f
 */
export function access<R, A>(f: (_: R) => A): Async<R, never, A> {
  return accessM((r: R) => succeed(f(r)))
}

/**
 * Access the environment
 */
export function environment<R>(): Async<R, never, R> {
  return accessM((r: R) => succeed(r))
}

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 */
export function either<R, E, A>(self: Async<R, E, A>): Async<R, never, E.Either<E, A>> {
  return fold_(self, E.left, E.right)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(that: () => Async<R2, E2, A2>) {
  return <R, E, A>(self: Async<R, E, A>): Async<R & R2, E2, E.Either<A, A2>> =>
    orElseEither_(self, that)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Async<R, E, A>,
  that: () => Async<R2, E2, A2>
): Async<R & R2, E2, E.Either<A, A2>> {
  return foldM_(
    self,
    () => map_(that(), (a) => E.right(a)),
    (a) => succeed(E.left(a))
  )
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<R1, E1, A, B, C>(that: Async<R1, E1, B>, f: (a: A, b: B) => C) {
  return <R, E>(self: Async<R, E, A>): Async<R & R1, E1 | E, C> =>
    zipWith_(self, that, f)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: Async<R, E, A>,
  that: Async<R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return chain_(self, (a) => map_(that, (b) => f(a, b)))
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @ets_data_first zip_
 */
export function zip<R1, E1, B>(that: Async<R1, E1, B>) {
  return <R, E, A>(self: Async<R, E, A>) => zip_(self, that)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 */
export function zip_<R, E, A, R1, E1, B>(self: Async<R, E, A>, that: Async<R1, E1, B>) {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Suspend a computation, useful in recursion
 */
export function suspend<R, E, A>(f: () => Async<R, E, A>): Async<R, E, A> {
  return new ISuspend(f)
}

/**
 * Lift a sync (non failable) computation
 */
export function succeedWith<A>(f: () => A) {
  return suspend(() => succeed<A>(f()))
}

/**
 * Lift a sync (non failable) computation
 */
export function tryCatch<E, A>(f: () => A, onThrow: (u: unknown) => E) {
  return suspend(() => {
    try {
      return succeed<A>(f())
    } catch (u) {
      return fail(onThrow(u))
    }
  })
}

// construct from a promise
export function promise<E, A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
  onError: (u: unknown) => E
): Async<unknown, E, A> {
  return new IPromise(promise, onError)
}

// construct from a non failable promise
export function unfailable<A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>
): Async<unknown, never, A> {
  return new IPromise(promise, () => undefined as never)
}

// construct a Task from an exit value
export function done<E, A>(exit: Exit<E, A>): Async<unknown, E, A> {
  return new IDone(exit)
}

// like .then in Promise when the result of f is a Promise but ignores the outout of f
// useful for logging or doing things that should not change the result
export function tapError<EA, B, EB, R>(f: (_: EA) => Async<R, EB, B>) {
  return <R1, A>(self: Async<R1, EA, A>) =>
    pipe(
      self,
      catchAll((e) =>
        pipe(
          f(e),
          chain((_) => fail(e))
        )
      )
    )
}

// sleeps for ms milliseconds
export function sleep(ms: number) {
  return unfailable(
    (onInterrupt) =>
      new Promise((res) => {
        const timer = setTimeout(() => {
          res(undefined)
        }, ms)

        onInterrupt(() => {
          clearTimeout(timer)
        })
      })
  )
}

// delay the computation prepending a sleep of ms milliseconds
export function delay(ms: number) {
  return <R, E, A>(self: Async<R, E, A>) =>
    pipe(
      sleep(ms),
      chain(() => self)
    )
}

// list an Either
export function fromEither<E, A>(e: E.Either<E, A>) {
  return e._tag === "Right" ? succeed(e.right) : fail(e.left)
}

/**
 * Compact the union produced by the result of f
 *
 * @ets_optimize identity
 */
export function unionFn<ARGS extends any[], Ret extends Async<any, any, any>>(
  _: (...args: ARGS) => Ret
): (...args: ARGS) => Async<U._R<Ret>, U._E<Ret>, U._A<Ret>> {
  return _ as any
}

/**
 * Compact the union
 *
 * @ets_optimize identity
 */
export function union<Ret extends Async<any, any, any>>(
  _: Ret
): Async<U._R<Ret>, U._E<Ret>, U._A<Ret>> {
  return _ as any
}

/**
 * Get the A from an option
 */
export default function tryCatchOption_<A, E>(ma: Option<A>, onNone: () => E) {
  return pipe(E.fromOption_(ma, onNone), fromEither)
}

/**
 * Get the A from an option
 *
 * @ets_data_first tryCatchOption_
 */
export function tryCatchOption<A, E>(onNone: () => E) {
  return (ma: Option<A>) => tryCatchOption_(ma, onNone)
}
