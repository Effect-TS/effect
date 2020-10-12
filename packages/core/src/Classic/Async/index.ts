/**
 * The Async Problem
 */

import * as T from "../../Effect"
import { pipe } from "../../Function"
import type { UnionToIntersection } from "../../Utils"

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

export class Async<R, E, A> extends T.FFI<unknown, never, number> {
  constructor(readonly f: (_: InterruptionState, r: R) => CancelablePromise<E, A>) {
    super()
  }
  get [T._I]() {
    return T.accessM((r: R) =>
      T.effectAsyncInterrupt<R, E, A>((cb) => {
        const int = runAsync(this, r, (ex) => {
          if (ex._tag === "Success") {
            cb(T.succeed(ex.a))
          } else if (ex._tag === "Failure") {
            cb(T.fail(ex.e))
          } else {
            cb(T.interrupt)
          }
        })
        return T.effectTotal(() => {
          int()
        })
      })
    )[T._I]
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

export const failure = <E>(e: E): Rejection<E> => ({
  _tag: "Failure",
  e
})

export const interrupt: Rejection<never> = {
  _tag: "Interrupt"
}

export const success = <A>(a: A): Exit<never, A> => ({
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
    this.rejection?.(interrupt)
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
        p.then((a) => success(a)).catch((e) => Promise.resolve(e))
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
function runCancelablePromise<E, A>(
  task: CancelablePromise<E, A>
): Promise<Exit<E, A>> {
  return tracingContext
    .traced(task.promise)()
    .then((a) => success(a))
    .catch((e: Rejection<E>) => Promise.resolve(e))
}

// runs as a Promise of an Exit
export function runPromise<R, E, A>(task: Async<R, E, A>, r: R): Promise<Exit<E, A>> {
  return runCancelablePromise(task.f(new InterruptionState(), r))
}

// runs as a Cancellable task
export function runAsync<R, E, A>(
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

// construct a Task from an error
export const fail = <E>(e: E): Async<unknown, E, never> =>
  new Async((is) => new CancelablePromise(() => Promise.reject(failure(e)), is))

// construct an empty task of {}
// useful to combine with bind & assign
export const of = succeed({})

// construct a Task from a promise that can fail
// need to specify the action to take on error
export const fromPromise = <E>(onError: (u: unknown) => E) => <A>(
  p: () => Promise<A>
): Async<unknown, E, A> =>
  new Async(
    (is) =>
      new CancelablePromise(
        () => p().catch((e) => Promise.reject(failure(onError(e)))),
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
          return Promise.reject(failure(onError(e)))
        }
      }, is)
  )
}

// construct a Task from a promise that cannot fail
export const fromNonFailingPromise = <A>(
  p: () => Promise<A>
): Async<unknown, never, A> => new Async((is) => new CancelablePromise(p, is))

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
                rej(failure(err))
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
      (e) => succeed(failure(e)),
      (a) => succeed(success(a))
    )
  )

// like Promise.all
export function all<R, E, A>(a: Async<R, E, A>[]): Async<R, E, A[]> {
  return new Async(
    (is, r) =>
      new CancelablePromise(() => Promise.all(a.map((p) => p.f(is, r).promise())), is)
  )
}

// like Promise.all for tuples
export function sequence<Tasks extends Async<any, any, any>[]>(
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
  return all(tasks) as any
}

// like Promise.all + map on steroids
export const foreach = <R, A, E1, B>(f: (a: A) => Async<R, E1, B>) => (
  as: Iterable<A>
) => all(Array.from(as).map(f))

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
export const assign = <K extends string>(k: K) => <S, A1>(f: (s: S) => A1) => <R, E>(
  self: Async<R, E, S>
): Async<R, E, S & { [k in K]: A1 }> =>
  pipe(
    self,
    map((s) => pipe(f(s), (a1) => ({ ...s, [k]: a1 } as S & { [k in K]: A1 })))
  )

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

                  return await Promise.reject(failure(e))
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
                  rej(failure(err))
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
