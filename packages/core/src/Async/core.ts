/**
 * Async is a lightweight Effect data type that support as parameters:
 * - R: environment
 * - E: error
 * - A: output
 *
 * And additionally supports interruption
 */

import type { Cause } from "@effect-ts/system/Cause"
import type { Effect, EffectURI, FFI, Instruction } from "@effect-ts/system/Effect"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

import type { Either } from "../Classic/Either"
import * as E from "../Classic/Either"
import * as O from "../Classic/Option"
import { flow, identity, pipe, tuple as mkTuple } from "../Function"
import type { Has, Tag } from "../Has"
import type { AsyncURI } from "../Modules"
import * as P from "../Prelude"
import * as DSL from "../Prelude/DSL"
import type { Sync } from "../Sync"
import { runEitherEnv } from "../Sync"
import type { _E, _R } from "../Utils"

// base types & effect ffi

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

export abstract class Async<R, E, A> implements FFI<R, E, A> {
  readonly _tag = "FFI"
  readonly _S1!: (_: unknown) => void
  readonly _S2!: () => never;

  readonly ["_U"]!: EffectURI;
  readonly ["_E"]!: () => E;
  readonly ["_A"]!: () => A;
  readonly ["_R"]!: (_: R) => void

  get ["_I"](): Instruction {
    const ci = currentIntegration.get
    if (ci._tag === "Some") {
      return ci.value(this)["_I"]
    }
    return notIimplementedFFI
  }

  get ["_AI"](): AsyncInstruction {
    return this as any
  }
}

// Instructions

export type AsyncInstruction =
  | IOf<any>
  | ISuspend<any, any, any>
  | IPromise<any, any>
  | IChain<any, any, any, any, any, any>
  | IFold<any, any, any, any, any, any, any, any, any>
  | IRead<any, any>
  | IDone<any, any>
  | IProvide<any, any, any>
  | IFinalizer<any, any, any, any, any, any>
  | IAll<any, any, any>

export class IOf<A> extends Async<unknown, never, A> {
  readonly _asyncTag = "IOf"

  constructor(readonly a: A) {
    super()
  }
}

export class IDone<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "IDone"

  constructor(readonly exit: Exit<E, A>) {
    super()
  }
}

export class IRead<R, A> extends Async<R, never, A> {
  readonly _asyncTag = "IRead"

  constructor(readonly f: (r: R) => A) {
    super()
  }
}

export class IProvide<R, E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "IProvide"

  constructor(readonly self: Async<R, E, A>, readonly r: R) {
    super()
  }
}

export class IAll<R, E, A> extends Async<R, E, readonly A[]> {
  readonly _asyncTag = "IAll"

  constructor(readonly self: readonly Async<R, E, A>[]) {
    super()
  }
}

export class ISuspend<R, E, A> extends Async<R, E, A> {
  readonly _asyncTag = "ISuspend"

  constructor(readonly async: () => Async<R, E, A>) {
    super()
  }
}

export class IPromise<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = "IPromise"

  constructor(
    readonly promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly onError: (u: unknown) => E
  ) {
    super()
  }
}

export class IChain<R, E, A, R2, E2, B> extends Async<R & R2, E | E2, B> {
  readonly _asyncTag = "IChain"

  constructor(readonly self: Async<R, E, A>, readonly f: (a: A) => Async<R2, E2, B>) {
    super()
  }
}

export class IFold<R, E, A, R2, E2, B, R3, E3, C> extends Async<
  R & R2 & R3,
  E2 | E3,
  B | C
> {
  readonly _asyncTag = "ICatch"

  constructor(
    readonly self: Async<R, E, A>,
    readonly f: (a: E) => Async<R2, E2, B>,
    readonly g: (a: A) => Async<R3, E3, C>
  ) {
    super()
  }
}

export class IFinalizer<R, E, A, R2, E2, B> extends Async<R & R2, E2, A> {
  readonly _asyncTag = "IFinalizer"

  constructor(readonly self: Async<R, E, A>, readonly f: () => Async<R2, E2, B>) {
    super()
  }
}

// Exit

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

// the actual driver
async function runInternal<R, E, A>(
  self: Async<R, E, A>,
  r: R,
  is = new InterruptionState()
): Promise<A> {
  const op = self["_AI"]

  if (is.interrupted) {
    throw interruptExit
  }

  switch (op._asyncTag) {
    case "IOf": {
      return op.a
    }
    case "ISuspend": {
      return await runInternal(op.async(), r, is)
    }
    case "IRead": {
      return op.f(r)
    }
    case "IDone": {
      switch (op.exit._tag) {
        case "Success": {
          return op.exit.a
        }
        case "Failure": {
          throw op.exit.e
        }
        case "Interrupt": {
          throw interruptExit
        }
      }
    }
    case "IChain": {
      const a = await runInternal(op.self, r, is)

      return await runInternal(op.f(a), r, is)
    }
    case "IProvide": {
      return await runInternal(op.self, op.r, is)
    }
    case "ICatch": {
      const a = await runPromiseExitEnv(op.self, r, is)

      switch (a._tag) {
        case "Failure": {
          return await runInternal(op.f(a.e), r, is)
        }
        case "Success": {
          return a.a
        }
        case "Interrupt": {
          throw interruptExit
        }
      }
    }
    case "IFinalizer": {
      const a = await runPromiseExitEnv(op.self, r, is)

      switch (a._tag) {
        case "Failure": {
          throw failExit(a.e)
        }
        case "Success": {
          return a.a
        }
        case "Interrupt": {
          await runInternal(op.f(), r, new InterruptionState())
          throw interruptExit
        }
      }
    }
    case "IPromise": {
      return await new CancelablePromise(
        (s) => op.promise(s).catch((e) => Promise.reject(failExit(e))),
        is
      ).promise()
    }
    case "IAll": {
      return (await Promise.all(op.self.map((a) => runInternal(a, r, is)))) as any
    }
  }
}

// running

// runs as a Promise of an Exit
export async function runPromiseExitEnv<R, E, A>(
  task: Async<R, E, A>,
  r: R,
  is = new InterruptionState()
): Promise<Exit<E, A>> {
  try {
    const a = await tracingContext.traced(() => runInternal(task, r, is))()
    return successExit(a)
  } catch (e) {
    return e
  }
}

// runs as a Promise of an Exit
export async function runPromiseExit<E, A>(
  task: Async<unknown, E, A>,
  is = new InterruptionState()
): Promise<Exit<E, A>> {
  try {
    const a = await tracingContext.traced(() => runInternal(task, {}, is))()
    return successExit(a)
  } catch (e) {
    return e
  }
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

// constructors & combinators

// construct a Task from a value
export function succeed<A>(a: A): Async<unknown, never, A> {
  return new IOf(a)
}

// construct a Task from an exit value
export function done<E, A>(exit: Exit<E, A>): Async<unknown, E, A> {
  return new IDone(exit)
}

// construct a Task from a sync computation that is not supposed to fail
export function sync<A>(f: () => A): Async<unknown, never, A> {
  return unfailable(() => Promise.resolve(f()))
}

// construct a Task from an error
export function fail<E>(error: E): Async<unknown, E, never> {
  return new IDone(failExit(error))
}

// like .then in Promise when the inner result is a Promise
export function chain<A, R2, E2, B>(f: (a: A) => Async<R2, E2, B>) {
  return <R, E>(self: Async<R, E, A>): Async<R & R2, E | E2, B> => new IChain(self, f)
}

// like chain(identity)
export const flatten: <R, E, R2, E2, A>(
  _: Async<R, E, Async<R2, E2, A>>
) => Async<R & R2, E | E2, A> = chain(identity)

// reads a value from the environment and transforms it using f
export function access<R, A>(f: (r: R) => A): Async<R, never, A> {
  return new IRead(f)
}

// reads a value from the environment and transforms it monadically using f
export const accessM = <R, R1, E, A>(
  f: (_: R) => Async<R1, E, A>
): Async<R & R1, E, A> => flatten(access(f))

// like .then in Promise when the result of f is a Promise but ignores the outout of f
// useful for logging or doing things that should not change the result
export function tap<A, B, EB, R>(f: (_: A) => Async<R, EB, B>) {
  return <R1, EA>(self: Async<R1, EA, A>): Async<R & R1, EA | EB, A> =>
    pipe(
      self,
      chain((a) =>
        pipe(
          f(a),
          map(() => a)
        )
      )
    )
}

// like .then in Promise when the result of f is a Promise but ignores the outout of f
// useful for logging or doing things that should not change the result
export function tapError<EA, B, EB, R>(f: (_: EA) => Async<R, EB, B>) {
  return <R1, A>(self: Async<R1, EA, A>): Async<R & R1, EA | EB, A> =>
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

// like .then + .catch
export function fold<A, E, E1, A1, E2, A2, R1, R2>(
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
) {
  return <R>(self: Async<R, E, A>): Async<R & R1 & R2, E1 | E2, A1 | A2> =>
    new IFold(self, f, g)
}

// like .catch in Promise
export function catchAll<R, E, E1, B>(f: (e: E) => Async<R, E1, B>) {
  return <R1, A>(self: Async<R1, E, A>): Async<R & R1, E1, A | B> =>
    pipe(self, fold(f, succeed))
}

// provides environment to an async
export function provideAll<R>(
  r: R
): <E, A>(self: Async<R, E, A>) => Async<unknown, E, A> {
  return (self) => new IProvide(self, r)
}

// suspends the computation
export function suspend<R, E, A>(f: () => Async<R, E, A>): Async<R, E, A> {
  return new ISuspend(f)
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

// maps over the success result
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Async<R, E, A>): Async<R, E, B> =>
    new IChain(self, flow(f, succeed))
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

// logically runs the operation and return its exit
export function result<R, E, A>(task: Async<R, E, A>): Async<R, never, Exit<E, A>> {
  return pipe(
    task,
    fold(
      (e) => succeed(failExit(e)),
      (a) => succeed(successExit(a))
    )
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
  _R<Tasks[number]>,
  _E<Tasks[number]>,
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

// runs a finalizer on interruption
export function onInterrupt<R, E1, A1>(f: () => Async<R, E1, A1>) {
  return <R2, E, A>(self: Async<R, E, A>): Async<R & R2, E | E1, A> =>
    new IFinalizer(self, f)
}

// zips the result of both async in a pair
export function zip<R2, E2, B>(fb: Async<R2, E2, B>) {
  return <R, E, A>(fa: Async<R, E, A>): Async<R2 & R, E2 | E, readonly [A, B]> =>
    pipe(
      fa,
      chain((a) =>
        pipe(
          fb,
          map((b) => mkTuple(a, b))
        )
      )
    )
}

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Covariant = P.instance<P.Covariant<[AsyncURI], V>>({
  map
})

export const Any = P.instance<P.Any<[AsyncURI], V>>({
  any: () => succeed({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[AsyncURI], V>>({
  both: zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[AsyncURI], V>>({
  flatten
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
    catchAll((e) => succeed(E.left(e)))
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
