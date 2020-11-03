/* eslint-disable prefer-const */
import type { Cause } from "../Cause"
import type { EffectURI } from "../Effect/effect"
import { _A, _E, _I, _R, _U } from "../Effect/effect"
import type { Effect, Instruction } from "../Effect/primitives"
import * as E from "../Either"
import { pipe } from "../Function"
import * as O from "../Option"
import { Stack } from "../Stack"
import { AtomicReference } from "../Support/AtomicReference"
import type * as U from "../Utils"

export const currentIntegration = new AtomicReference<
  O.Option<<R, E, A>(_: Async<R, E, A>) => Effect<R, E, A>>
>(O.none)

export class IFailEffect<E> {
  readonly _tag = "Fail"
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly ["_U"]!: EffectURI;
  readonly ["_E"]!: () => E;
  readonly ["_A"]!: () => never;
  readonly ["_R"]!: (_: unknown) => void

  constructor(readonly cause: Cause<E>) {}

  get ["_I"](): Instruction {
    return this as any
  }
}

export const notIimplementedFFI = new IFailEffect({
  _tag: "Die",
  value: new Error("not supported")
})

/**
 * `Async[ S2, R, E, A]` is a purely functional description of a computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `Async` can be used to model a variety of effects
 * including context, state, and failure.
 */
export abstract class Async<R, E, A> {
  readonly _tag = "Async"
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly [_U]!: EffectURI;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void

  get [_I](): Instruction {
    const ci = currentIntegration.get
    if (ci._tag === "Some") {
      return ci.value(this)["_I"]
    }
    return notIimplementedFFI
  }
}

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

class IAll<R, E, A> extends Async<R, E, readonly A[]> {
  readonly _asyncTag = "All"

  constructor(readonly self: readonly Async<R, E, A>[]) {
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
  | IAll<R, E, A>

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
    // set to interrupted
    this.isInterrupted = true
    // notify
    this.listeners.forEach((i) => {
      i()
    })
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
        case "All": {
          const exits = await Promise.all(xp.self.map((a) => runPromiseExit(a, is)))
          const as = []
          let errored = false
          for (let i = 0; i < exits.length && !errored; i += 1) {
            const e = exits[i]
            switch (e._tag) {
              case "Success": {
                as.push(e.a)
                break
              }
              case "Failure": {
                errored = true
                curAsync = new IFail(e.e)
                break
              }
              case "Interrupt": {
                errored = true
                interruptedLocal = true
                curAsync = undefined
                break
              }
            }
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
                (s) => xp.promise(s).catch((e) => Promise.reject(failExit(e))),
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
 */
export function tap<A, S2, S3, R1, E1>(f: (a: A) => Async<R1, E1, any>) {
  return <R, E>(self: Async<R, E, A>): Async<R & R1, E | E1, A> => tap_(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export function tap_<R, E, A, R1, E1>(
  self: Async<R, E, A>,
  f: (a: A) => Async<R1, E1, any>
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
 * or righr function passed to `fold`.
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
export function provide_<E, A, R = unknown, R0 = unknown>(
  next: Async<R & R0, E, A>,
  r: R
): Async<R0, E, A> {
  return provideSome((r0: R0) => ({ ...r0, ...r }))(next)
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
  return zipWith_(self, that, (a, b) => [a, b] as const)
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
export function sync<A>(f: () => A) {
  return suspend(() => succeed<A>(f()))
}

/**
 * Lift a sync (non failable) computation
 */
export function tryCatch<E>(onThrow: (u: unknown) => E) {
  return <A>(f: () => A) =>
    suspend(() => {
      try {
        return succeed<A>(f())
      } catch (u) {
        return fail(onThrow(u))
      }
    })
}

// construct from a promise
export function promise<E>(onError: (u: unknown) => E) {
  return <A>(
    promise: (onInterrupt: (f: () => void) => void) => Promise<A>
  ): Async<unknown, E, A> => new IPromise(promise, onError)
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

// like Promise.all
export function collectAll<R, E, A>(
  a: readonly Async<R, E, A>[]
): Async<R, E, readonly A[]> {
  return new IAll(a)
}

// like Promise.all for tuples
export function tuple<Tasks extends Async<any, any, any>[]>(
  ...tasks: Tasks & { 0: Async<any, any, any> }
): Async<
  U._R<Tasks[number]>,
  U._E<Tasks[number]>,
  { [k in keyof Tasks]: [Tasks[k]] extends [Async<any, any, infer A>] ? A : never }
> {
  return collectAll(tasks) as any
}

// like Promise.all + map on steroids
export function foreach<R, A, E1, B>(f: (a: A) => Async<R, E1, B>) {
  return (as: Iterable<A>) => collectAll(Array.from(as).map(f))
}

// binds the output of a computation to a variable
// useful for imperative style, like using async/await
export const bind = <K extends string>(k: K) => <R, S, E1, A1>(
  f: (s: S) => Async<R, E1, A1>
) => <R1, E>(self: Async<R1, E, S>): Async<R & R1, E | E1, S & { [k in K]: A1 }> =>
  pipe(
    self,
    chain((s) =>
      pipe(
        f(s),
        map((a1) => ({ ...s, [k]: a1 } as S & { [k in K]: A1 }))
      )
    )
  )

// binds the result of a function to a variable
// useful for imperative style, like using async/await
const assign = <K extends string>(k: K) => <S, A1>(f: (s: S) => A1) => <R, E>(
  self: Async<R, E, S>
): Async<R, E, S & { [k in K]: A1 }> =>
  pipe(
    self,
    map((s) => pipe(f(s), (a1) => ({ ...s, [k]: a1 } as S & { [k in K]: A1 })))
  )

export { assign as let }
