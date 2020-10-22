/**
 * The Async Problem
 */

import type { Cause } from "@effect-ts/system/Cause"
import type { Effect, EffectURI, FFI, Instruction } from "@effect-ts/system/Effect"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

import { flow, identity, pipe, tuple as mkTuple } from "../../Function"
import type { AsyncURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { Sync } from "../../Sync"
import { runEitherEnv } from "../../Sync"
import type { UnionToIntersection } from "../../Utils"
import type { Either } from "../Either"
import * as E from "../Either"
import type { Has, Tag } from "../Has"
import * as O from "../Option"

/**
 * During the last part of day-2 when we started to test async code we noticed
 * already a few problems with promises, namely:
 * - Promises don't interrupt
 * - Promises are hard to track
 *
 * We didn't notice further issues because all the tests we were testing the
 * happy path of components or happy paths of computations.
 *
 * The key problematic: Promise don't carry type informations on the error channel.
 */

/**
 * The reasons behind this great miss is that the API of promises is Fluent based, that makes
 * handling the Error channel as a union type impossible.
 *
 * The other reason is support of async/await to make imperative code possible
 */

/**
 * The Goal,
 *
 * We would like to have a data type Task<E, A> where
 * - E represents a potential Error
 * - A represents a potential Success
 *
 * That is:
 * - Lazy
 * - Supports interruption
 * - Carry the types of both success and failure properly
 */

/**
 * Step 1, The Data Type
 */

export const currentIntegration = new AtomicReference<
  O.Option<<R, E, A>(_: Async<R, E, A>) => Effect<R, E, A>>
>(O.none)

export class IFail<E> {
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

export const notIimplementedFFI = new IFail({
  _tag: "Die",
  value: new Error("not supported")
})

export class Async<R, E, A> implements FFI<R, E, A> {
  readonly _tag = "FFI"
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly ["_U"]!: EffectURI;
  readonly ["_E"]!: () => E;
  readonly ["_A"]!: () => A;
  readonly ["_R"]!: (_: R) => void

  constructor(readonly f: (_: InterruptionState, r: R) => CancelablePromise<E, A>) {}

  get ["_I"](): Instruction {
    const ci = currentIntegration.get
    if (ci._tag === "Some") {
      return ci.value(this)["_I"]
    }
    return notIimplementedFFI
  }
}

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

export const interruptExit: Rejection<never> = {
  _tag: "Interrupt"
}

export const successExit = <A>(a: A): Exit<never, A> => ({
  _tag: "Success",
  a
})

export class CancelablePromise<E, A> {
  // holds the type information of E
  readonly _E!: () => E

  // gets called with a Rejection<E>, any here is to not break covariance imposed by _E
  private rejection: ((e: Rejection<any>) => void) | undefined = undefined

  // holds the current running promise
  private current: Promise<A> | undefined = undefined

  constructor(
    // creates the promise
    readonly promiseFactory: () => Promise<A>,
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
      // we record the current interrupt in the interruption registry
      const removeListener = this.is.listen(() => {
        this.interrupt()
      })
      const p = new Promise<A>((res, rej) => {
        // set the rejection handler
        this.rejection = rej

        // creates the underlying promise
        this.promiseFactory()
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
    this.rejection?.(interruptExit)
  }
}

/**
 * Step 2, Tracking
 */

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
 * Step 3, Running
 */

// runs the cancellable promise in a tracing context
// folds the result to an Exit state
async function runCancelablePromise<E, A>(
  task: CancelablePromise<E, A>
): Promise<Exit<E, A>> {
  try {
    const a = await tracingContext.traced(task.promise)()
    return successExit(a)
  } catch (e) {
    return await Promise.resolve(e)
  }
}

// runs as a Promise of an Exit
export function runPromiseExit<E, A>(task: Async<unknown, E, A>): Promise<Exit<E, A>> {
  return runCancelablePromise(task.f(new InterruptionState(), {}))
}

// runs as a Promise of an Exit
export async function runPromise<E, A>(task: Async<unknown, E, A>): Promise<A> {
  const e = await runCancelablePromise(task.f(new InterruptionState(), {}))
  if (e._tag === "Success") {
    return Promise.resolve(e.a)
  } else {
    return Promise.reject(e)
  }
}

// runs as a Promise of an Exit
export function runPromiseEnv<R, E, A>(
  task: Async<R, E, A>,
  r: R
): Promise<Exit<E, A>> {
  return runCancelablePromise(task.f(new InterruptionState(), r))
}

export function runAsync<E, A>(
  task: Async<unknown, E, A>,
  cb?: (e: Exit<E, A>) => void
) {
  return runAsyncEnv(task, {}, cb)
}

// runs as a Cancellable task
export function runAsyncEnv<R, E, A>(
  task: Async<R, E, A>,
  r: R,
  cb?: (e: Exit<E, A>) => void
) {
  const is = new InterruptionState()
  const interruptible = task.f(is, r)
  const running = runCancelablePromise(interruptible)

  running.then((e) => {
    cb?.(e)
  })

  return () => {
    is.interrupt()
  }
}

/**
 * Step 4, Constructors
 */

// construct a Task from a sync computation that is not supposed to fail
export const sync = <A>(f: () => A): Async<unknown, never, A> =>
  new Async((is) => new CancelablePromise(() => Promise.resolve(f()), is))

// construct a Task from a value
export const succeed = <A>(a: A): Async<unknown, never, A> =>
  new Async((is) => new CancelablePromise(() => Promise.resolve(a), is))

// reads a value from the environment and transforms it using f
export const access = <A, B>(f: (_: A) => B): Async<A, never, B> =>
  new Async((is, r) => new CancelablePromise(() => Promise.resolve(f(r)), is))

// reads a value from the environment and transforms it monadically using f
export const accessM = <R, R1, E, A>(
  f: (_: R) => Async<R1, E, A>
): Async<R & R1, E, A> =>
  new Async((is, r) => new CancelablePromise(() => f(r).f(is, r).promise(), is))

// reads a value from the environment and transforms it monadically using f
export const provideAll = <R>(r: R) => <E, A>(
  fa: Async<R, E, A>
): Async<unknown, E, A> =>
  new Async((is, _: unknown) => new CancelablePromise(() => fa.f(is, r).promise(), is))

// construct a Task from an error
export const fail = <E>(e: E): Async<unknown, E, never> =>
  new Async((is) => new CancelablePromise(() => Promise.reject(failExit(e)), is))

// construct an empty task of {}
// useful to combine with bind & assign
const of = succeed({})

export { of as do }

// construct a Task from a promise that can fail
// need to specify the action to take on error
export const fromPromise = <A>(p: () => Promise<A>): Async<unknown, unknown, A> =>
  new Async(
    (is) =>
      new CancelablePromise(() => p().catch((e) => Promise.reject(failExit(e))), is)
  )

// construct a Task from a promise that can fail
// need to specify the action to take on error
export const fromPromiseMap = <E>(onError: (u: unknown) => E) => <A>(
  p: () => Promise<A>
): Async<unknown, E, A> =>
  new Async(
    (is) =>
      new CancelablePromise(
        () => p().catch((e) => Promise.reject(failExit(onError(e)))),
        is
      )
  )

// like fromPromise but for sync code that can throw
export const fromTryCatch = <E>(onError: (u: unknown) => E) => <A>(
  p: () => A
): Async<unknown, E, A> => {
  return new Async(
    (is) =>
      new CancelablePromise(() => {
        try {
          return Promise.resolve(p())
        } catch (e) {
          return Promise.reject(failExit(onError(e)))
        }
      }, is)
  )
}

// construct a Task from a promise that cannot fail
export const fromTask = <A>(p: () => Promise<A>): Async<unknown, never, A> =>
  new Async((is) => new CancelablePromise(p, is))

// represent a callback
export type Cb<A> = (a: A) => void

// construct a Task from an async callback (like new Promise())
export const fromCallback = <E = never, A = void>(
  f: (resolve: (res: A) => void, reject: (error: E) => void) => void
): Async<unknown, E, A> =>
  new Async(
    (is) =>
      new CancelablePromise(
        () =>
          new Promise<A>((res, rej) => {
            f(
              (result) => {
                res(result)
              },
              (err) => {
                rej(failExit(err))
              }
            )
          }),
        is
      )
  )

/**
 * Step 5, Combinators
 */

// like .then in Promise when the inner result is a Promise
export const chain = <R, A, B, EB>(f: (_: A) => Async<R, EB, B>) => <EA, R1>(
  self: Async<R1, EA, A>
): Async<R1 & R, EA | EB, B> => pipe(self, fold(fail, f))

// like .then in Promise when the result of f is a Promise but ignores the outout of f
// useful for logging or doing things that should not change the result
export const tap = <A, B, EB, R>(f: (_: A) => Async<R, EB, B>) => <R1, EA>(
  self: Async<R1, EA, A>
): Async<R & R1, EA | EB, A> =>
  pipe(
    self,
    chain((a) =>
      pipe(
        f(a),
        map((_) => a)
      )
    )
  )

// like .then in Promise when the result of f is a Promise but ignores the outout of f
// useful for logging or doing things that should not change the result
export const tapError = <EA, B, EB, R>(f: (_: EA) => Async<R, EB, B>) => <R1, A>(
  self: Async<R1, EA, A>
): Async<R & R1, EA | EB, A> =>
  pipe(
    self,
    handle((e) =>
      pipe(
        f(e),
        chain((_) => fail(e))
      )
    )
  )

// like .then in Promise when the result of f is a value
export const map = <A, B>(f: (_: A) => B) => <R, E>(
  self: Async<R, E, A>
): Async<R, E, B> =>
  pipe(
    self,
    chain((a) => succeed(f(a)))
  )

// like .catch in Promise
export const handle = <R, E = never, E1 = never, B = unknown>(
  f: (e: E) => Async<R, E1, B>
) => <R1, A>(self: Async<R1, E, A>): Async<R & R1, E1, A | B> =>
  pipe(self, fold(f, succeed))

// like .then + .catch
export const fold = <A, E, E1, A1, E2, A2, R1, R2>(
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
) => <R>(self: Async<R, E, A>): Async<R & R1 & R2, E1 | E2, A1 | A2> =>
  new Async(
    (is, r) =>
      new CancelablePromise(
        () =>
          self
            .f(is, r)
            .promise()
            .then((a) => g(a).f(is, r).promise())
            .catch((e: Rejection<E>) => {
              switch (e._tag) {
                case "Failure": {
                  return f(e.e).f(is, r).promise()
                }
                case "Interrupt": {
                  return Promise.reject(e)
                }
              }
            }),
        is
      )
  )

// logically runs the operation and return its exit
export const result = <R, E, A>(task: Async<R, E, A>): Async<R, never, Exit<E, A>> =>
  pipe(
    task,
    fold(
      (e) => succeed(failExit(e)),
      (a) => succeed(successExit(a))
    )
  )

// like Promise.all
export function collectAll<R, E, A>(a: Async<R, E, A>[]): Async<R, E, A[]> {
  return new Async(
    (is, r) =>
      new CancelablePromise(() => Promise.all(a.map((p) => p.f(is, r).promise())), is)
  )
}

// like Promise.all for tuples
export function tuple<Tasks extends Async<any, any, any>[]>(
  ...tasks: Tasks & { 0: Async<any, any, any> }
): Async<
  UnionToIntersection<
    {
      [k in keyof Tasks]: [Tasks[k]] extends [Async<infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[number]
  >,
  {
    [k in keyof Tasks]: [Tasks[k]] extends [Async<any, infer E, any>] ? E : never
  }[number],
  { [k in keyof Tasks]: [Tasks[k]] extends [Async<any, any, infer A>] ? A : never }
> {
  return collectAll(tasks) as any
}

// like Promise.all + map on steroids
export const foreach = <R, A, E1, B>(f: (a: A) => Async<R, E1, B>) => (
  as: Iterable<A>
) => collectAll(Array.from(as).map(f))

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

// sleeps
export const sleep = (ms: number) =>
  fromCallback((res: Cb<void>) => {
    setTimeout(() => {
      res()
    }, ms)
  })

// delayed
export const delayed = (ms: number) => <R, E, A>(task: Async<R, E, A>) =>
  pipe(
    sleep(ms),
    chain(() => task)
  )

export const onInterrupt = <R, E1, A1>(f: () => Async<R, E1, A1>) => <R2, E, A>(
  self: Async<R, E, A>
): Async<R & R2, E | E1, A> =>
  new Async(
    (is, r) =>
      new CancelablePromise(
        () =>
          self
            .f(is, r)
            .promise()
            .catch(async (e: Rejection<E>) => {
              switch (e._tag) {
                case "Failure": {
                  return Promise.reject(e)
                }
                case "Interrupt": {
                  await f().f(new InterruptionState(), r).promise()

                  return await Promise.reject(failExit(e))
                }
              }
            }),
        is
      )
  )

export const fromInterruptibleCallback = <E = never, A = void, E2 = never, A2 = void>(
  f: (resolve: (res: A) => void, reject: (error: E) => void) => Async<unknown, E2, A2>
): Async<unknown, E | E2, A> =>
  new Async((is) => {
    let finalizer: Async<unknown, E2, A2>

    const finalizerTask: Async<unknown, E, A> = new Async(
      (is: InterruptionState) =>
        new CancelablePromise(
          () =>
            new Promise<A>((res, rej) => {
              finalizer = f(
                (result) => {
                  res(result)
                },
                (err) => {
                  rej(failExit(err))
                }
              )
            }),
          is
        )
    )

    return pipe(
      finalizerTask,
      onInterrupt(() => finalizer)
    ).f(is, {})
  })

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Covariant = P.instance<P.Covariant<[AsyncURI], V>>({
  map
})

export const Any = P.instance<P.Any<[AsyncURI], V>>({
  any: () => succeed({})
})

export const zip: <R2, E2, B>(
  fb: Async<R2, E2, B>
) => <R, E, A>(fa: Async<R, E, A>) => Async<R2 & R, E2 | E, readonly [A, B]> = (fb) => (
  fa
) =>
  pipe(
    fa,
    chain((a) =>
      pipe(
        fb,
        map((b) => mkTuple(a, b))
      )
    )
  )

export const AssociativeBoth = P.instance<P.AssociativeBoth<[AsyncURI], V>>({
  both: zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[AsyncURI], V>>({
  flatten: (fa) => pipe(fa, chain(identity))
})

export const IdentityBoth = P.instance<P.IdentityBoth<[AsyncURI], V>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[AsyncURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<[AsyncURI], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<[AsyncURI], V>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Fail = P.instance<P.FX.Fail<[AsyncURI], V>>({
  fail
})

export const Run = P.instance<P.FX.Run<[AsyncURI], V>>({
  either: flow(
    map(E.right),
    handle((e) => succeed(E.left(e)))
  )
})

export const either: <A, R, E>(fa: Async<R, E, A>) => Async<R, never, E.Either<E, A>> =
  Run.either

export const getValidation = DSL.getValidationF({
  ...Monad,
  ...Run,
  ...Applicative,
  ...Fail
})

export const Provide = P.instance<P.FX.Provide<[AsyncURI], V>>({
  provide: provideAll
})

export const Access = P.instance<P.FX.Access<[AsyncURI], V>>({
  access
})

export const accessServiceM: <Service>(
  H: Tag<Service>
) => <R, E, A>(
  f: (_: Service) => Async<R, E, A>
) => Async<R & Has<Service>, E, A> = DSL.accessServiceMF({ ...Monad, ...Access })

export const accessService: <Service>(
  H: Tag<Service>
) => <A>(f: (_: Service) => A) => Async<Has<Service>, never, A> = (tag) => (f) =>
  accessServiceM(tag)((_) => succeed(f(_)))

export const provideService: <Service>(
  H: Tag<Service>
) => (
  S: Service
) => <R, E, A>(
  fa: Async<R & Has<Service>, E, A>
) => Async<R, E, A> = DSL.provideServiceF({ ...Monad, ...Provide, ...Access })

export const provideServiceM: <Service>(
  H: Tag<Service>
) => <R2, E2>(
  SM: Async<R2, E2, Service>
) => <R, E, A>(fa: Async<R & Has<Service>, E, A>) => Async<R & R2, E | E2, A> = (
  tag
) => (SM) => (fa) =>
  pipe(
    SM,
    chain((s) => pipe(fa, provideService(tag)(s)))
  )

export const provideSome: <R, R2>(
  f: (_: R2) => R
) => <E, A>(fa: Async<R, E, A>) => Async<R2, E, A> = DSL.provideSomeF({
  ...Monad,
  ...Access,
  ...Provide
})

export const gen_ = DSL.genF(Monad)

export function fromEither<E, A>(_: Either<E, A>) {
  return _._tag === "Left" ? fail(_.left) : succeed(_.right)
}

export function fromSync<R, E, A>(_: Sync<R, E, A>) {
  return accessM((r: R) => fromEither(runEitherEnv(r)(_)))
}
