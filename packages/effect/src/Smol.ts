/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.2.0
 */
import * as Context from "./Context.js"
import * as Either from "./Either.js"
import type { FiberRef } from "./FiberRef.js"
import { dual, identity, type LazyArg } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import * as fiberRef from "./internal/fiberRef.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import type { Covariant, NoInfer } from "./Types.js"

/**
 * @since 3.2.0
 */
export const TypeId = Symbol.for("effect/Smol")

/**
 * @since 3.2.0
 */
export type TypeId = typeof TypeId

/**
 * @since 3.2.0
 */
export interface Smol<out A, out E = never, out R = never> extends Pipeable {
  readonly [TypeId]: {
    _A: Covariant<A>
    _E: Covariant<E>
    _R: Covariant<R>
  }
  readonly run: (env: Env<any>, onResult: (result: Result<A, E>) => void) => void
}

/**
 * @since 3.2.0
 */
export const EnvTypeId = Symbol.for("effect/Smol/Env")

/**
 * @since 3.2.0
 */
export type EnvTypeId = typeof EnvTypeId

/**
 * @since 3.2.0
 */
export interface Env<R> {
  readonly [EnvTypeId]: {
    _R: Covariant<R>
  }
  readonly fiberRefs: ReadonlyMap<FiberRef<any>, unknown>
}

// Failures

/**
 * @since 3.2.0
 */
export const FailureTypeId = Symbol.for("effect/Smol/Failure")

/**
 * @since 3.2.0
 */
export type FailureTypeId = typeof FailureTypeId

/**
 * @since 3.2.0
 */
export type Failure<E> = Failure.Unexpected | Failure.Expected<E>

/**
 * @since 3.2.0
 */
export declare namespace Failure {
  /**
   * @since 3.2.0
   */
  export interface Proto extends Pipeable {
    readonly [FailureTypeId]: FailureTypeId
  }

  /**
   * @since 3.2.0
   */
  export interface Unexpected extends Proto {
    readonly _tag: "Unexpected"
    readonly defect: unknown
  }

  /**
   * @since 3.2.0
   */
  export interface Expected<E> extends Proto {
    readonly _tag: "Expected"
    readonly error: E
  }

  /**
   * @since 3.2.0
   */
  export interface Aborted extends Proto {
    readonly _tag: "Aborted"
  }
}

const FailureProto: Failure.Proto = {
  [FailureTypeId]: FailureTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 3.2.0
 */
export const FailureExpected = <E>(error: E): Failure<E> => {
  const self = Object.create(FailureProto)
  self._tag = "Expected"
  self.error = error
  return self
}

/**
 * @since 3.2.0
 */
export const FailureUnexpected = (defect: unknown): Failure<never> => {
  const self = Object.create(FailureProto)
  self._tag = "Unexpected"
  self.defect = defect
  return self
}

/**
 * @since 3.2.0
 */
export const FailureAborted: Failure<never> = Object.assign(Object.create(FailureProto), {
  _tag: "Aborted"
})

/**
 * @since 3.2.0
 */
export const failureSquash = <E>(self: Failure<E>): unknown => self._tag === "Expected" ? self.error : self.defect

// Result

/**
 * @since 3.2.0
 */
export type Result<A, E = never> = Either.Either<A, Failure<E>>

const ResultAborted = Either.left(FailureAborted)

// Handle

/**
 * @since 3.2.0
 */
export const HandleTypeId: unique symbol = Symbol.for("effect/Smol/Handle")

/**
 * @since 3.2.0
 */
export type HandleTypeId = typeof HandleTypeId

/**
 * @since 3.2.0
 */
export interface Handle<A, E = never> {
  readonly [HandleTypeId]: HandleTypeId
  readonly await: Smol<Result<A, E>>
  readonly join: Smol<A, E>
  readonly abort: Smol<void>
  readonly unsafeAbort: Smol<void>
}

// Smol

const SmolProto: Omit<Smol<any, any, any>, "run"> = {
  [TypeId]: {
    _A: identity,
    _E: identity,
    _R: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const unsafeMake = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Either.Either<A, Failure<E>>) => void) => void
): Smol<A, E, R> => {
  const self = Object.create(SmolProto)
  self.run = run
  return self
}

const unsafeMakeNoAbort = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Either.Either<A, Failure<E>>) => void) => void
): Smol<A, E, R> =>
  unsafeMake(function(env, onResult) {
    try {
      run(env, onResult)
    } catch (err) {
      onResult(Either.left(FailureUnexpected(err)))
    }
  })

/**
 * @since 3.2.0
 */
export const make = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Either.Either<A, Failure<E>>) => void) => void
): Smol<A, E, R> =>
  unsafeMake(function(env: Env<R>, onResult: (result: Result<A, E>) => void) {
    if (envGet(env, currentAbortSignal).aborted) {
      return onResult(ResultAborted)
    }

    try {
      run(env, onResult)
    } catch (err) {
      onResult(Either.left(FailureUnexpected(err)))
    }
  })

/**
 * @since 3.2.0
 */
export const succeed = <A>(a: A): Smol<A> => make((_context, onResult) => onResult(Either.right(a)))

/**
 * @since 3.2.0
 */
export const fail = <E>(e: E): Smol<never, E> => make((_context, onResult) => onResult(Either.left(FailureExpected(e))))

/**
 * @since 3.2.0
 */
export const failWith = <E>(failure: Failure<E>): Smol<never, E> =>
  make((_context, onResult) => onResult(Either.left(failure)))

/**
 * @since 3.2.0
 */
export const sync = <A>(evaluate: LazyArg<A>): Smol<A> =>
  make(function(_env, onResult) {
    onResult(Either.right(evaluate()))
  })

/**
 * @since 3.2.0
 */
export const fromResult = <A, E>(self: Result<A, E>): Smol<A, E> =>
  make(function(_env, onResult) {
    onResult(self)
  })

/**
 * @since 3.2.0
 */
export const flatten = <A, E, R, E2, R2>(self: Smol<Smol<A, E, R>, E2, R2>): Smol<A, E | E2, R | R2> =>
  make(function(env, onResult) {
    self.run(env, (result) => result._tag === "Left" ? onResult(result as any) : result.right.run(env, onResult))
  })

/**
 * @since 3.2.0
 */
export const map: {
  <A, B>(f: (a: NoInfer<A>) => B): <E, R>(self: Smol<A, E, R>) => Smol<B, E, R>
  <A, E, R, B>(self: Smol<A, E, R>, f: (a: NoInfer<A>) => B): Smol<B, E, R>
} = dual(2, <A, E, R, B>(self: Smol<A, E, R>, f: (a: A) => B): Smol<B, E, R> =>
  make(function(env, onResult) {
    self.run(env, function(result) {
      onResult(Either.map(result, f))
    })
  }))

/**
 * @since 3.2.0
 */
export const flatMap: {
  <A, B, E2, R2>(f: (a: NoInfer<A>) => Smol<B, E2, R2>): <E, R>(self: Smol<A, E, R>) => Smol<B, E, R>
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, f: (a: NoInfer<A>) => Smol<B, E2, R2>): Smol<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, f: (a: A) => Smol<B, E2, R2>): Smol<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      self.run(env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        f(result.right).run(env, onResult)
      })
    })
)

/**
 * @since 3.2.0
 */
export const tap: {
  <A, B, E2, R2>(f: (a: NoInfer<A>) => Smol<B, E2, R2>): <E, R>(self: Smol<A, E, R>) => Smol<A, E, R>
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, f: (a: NoInfer<A>) => Smol<B, E2, R2>): Smol<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, f: (a: A) => Smol<B, E2, R2>): Smol<A, E | E2, R | R2> =>
    make(function(env, onResult) {
      self.run(env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        f(result.right).run(env, function(_) {
          onResult(result)
        })
      })
    })
)

/**
 * @since 3.2.0
 */
export const zipRight: {
  <A, B, E2, R2>(that: Smol<B, E2, R2>): <E, R>(self: Smol<A, E, R>) => Smol<B, E, R>
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, that: Smol<B, E2, R2>): Smol<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Smol<A, E, R>, that: Smol<B, E2, R2>): Smol<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      self.run(env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        that.run(env, onResult)
      })
    })
)

/**
 * @since 3.2.0
 */
export const async = <A, E = never, R = never>(
  register: (resume: (effect: Smol<A, E, R>) => void, signal: AbortSignal) => void | Smol<void, never, R>
): Smol<A, E, R> =>
  flatten(
    make(function(env, onResult) {
      let resumed = false
      function resume(effect: Smol<A, E, R>) {
        if (resumed) {
          return
        }
        resumed = true
        onResult(Either.right(effect))
      }
      const signal = envGet(env, currentAbortSignal)
      const cleanup = register(resume, signal)
      if (cleanup) {
        signal.addEventListener("abort", () => {
          resume(uninterruptible(zipRight(cleanup, failWith(FailureAborted))))
        }, { once: true })
      }
    })
  )

/**
 * @since 3.2.0
 */
export const result = <A, E, R>(self: Smol<A, E, R>): Smol<Result<A, E>, never, R> =>
  make(function(env, onResult) {
    self.run(env, function(result) {
      onResult(Either.right(result))
    })
  })

/**
 * @since 3.2.0
 */
export const onResult: {
  <A, E, XE, XR>(f: (result: Result<A, E>) => Smol<A, XE, XR>): <R>(self: Smol<A, E, R>) => Smol<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Smol<A, E, R>, f: (result: Result<A, E>) => Smol<A, XE, XR>): Smol<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Smol<A, E, R>, f: (result: Result<A, E>) => Smol<A, XE, XR>): Smol<A, E | XE, R | XR> =>
    uninterruptibleMask((restore) =>
      flatMap(result(restore(self)), (result) => zipRight(f(result), fromResult(result)))
    )
)

/**
 * @since 3.2.0
 */
export const acquireUseRelease = <Resource, E, R, A, E2, R2, R3>(
  acquire: Smol<Resource, E, R>,
  use: (a: Resource) => Smol<A, E2, R2>,
  release: (a: Resource, result: Result<A, E2>) => Smol<void, never, R3>
): Smol<A, E | E2, R | R2 | R3> =>
  uninterruptibleMask((restore) =>
    flatMap(
      acquire,
      (a) => flatMap(result(restore(use(a))), (result) => zipRight(release(a, result), fromResult(result)))
    )
  )

/**
 * @since 3.2.0
 */
export const fiberRefGet = <A>(fiberRef: FiberRef<A>): Smol<A> =>
  make((env, onResult) => onResult(Either.right(envGet(env, fiberRef))))

/**
 * @since 3.2.0
 */
export const locally: {
  <A>(fiberRef: FiberRef<A>, value: A): <XA, E, R>(self: Smol<XA, E, R>) => Smol<XA, E, R>
  <XA, E, R, A>(self: Smol<XA, E, R>, fiberRef: FiberRef<A>, value: A): Smol<XA, E, R>
} = dual(
  3,
  <XA, E, R, A>(self: Smol<XA, E, R>, fiberRef: FiberRef<A>, value: A): Smol<XA, E, R> =>
    make((env, onResult) => self.run(envSet(env, fiberRef, value), onResult))
)

/**
 * @since 3.2.0
 */
export const context = <R>(): Smol<R, never, R> => fiberRefGet(fiberRef.currentContext) as any

/**
 * @since 3.2.0
 */
export const uninterruptible = <A, E, R>(self: Smol<A, E, R>): Smol<A, E, R> =>
  unsafeMakeNoAbort(function(env, onResult) {
    self.run(envSet(env, currentAbortSignal, new AbortController().signal), onResult)
  })

/**
 * @since 3.2.0
 */
export const uninterruptibleMask = <A, E, R>(
  f: (restore: <A, E, R>(effect: Smol<A, E, R>) => Smol<A, E, R>) => Smol<A, E, R>
): Smol<A, E, R> =>
  unsafeMakeNoAbort((env, onResult) => {
    const controller = envGet(env, currentAbortController)
    const signal = controller.signal
    const isInterruptible = controller.signal === signal
    const effect = isInterruptible ? f(interruptible) : f(identity)
    effect.run(envSet(env, currentAbortSignal, new AbortController().signal), onResult)
  })

/**
 * @since 3.2.0
 */
export const interruptible = <A, E, R>(self: Smol<A, E, R>): Smol<A, E, R> =>
  make((env, onResult) => {
    const controller = envGet(env, currentAbortController)
    const signal = controller.signal
    const newEnv = controller.signal === signal ? env : envSet(env, currentAbortSignal, signal)
    self.run(newEnv, onResult)
  })

/**
 * @since 3.2.0
 */
export const provideService: {
  <I, S>(tag: Context.Tag<I, S>, service: S): <A, E, R>(self: Smol<A, E, R>) => Smol<A, E, Exclude<R, I>>
  <A, E, R, I, S>(self: Smol<A, E, R>, tag: Context.Tag<I, S>, service: S): Smol<A, E, Exclude<R, I>>
} = dual(
  3,
  <A, E, R, I, S>(self: Smol<A, E, R>, tag: Context.Tag<I, S>, service: S): Smol<A, E, Exclude<R, I>> =>
    make(function(env, onResult) {
      const context = envGet(env, fiberRef.currentContext)
      const nextEnv = envSet(env, fiberRef.currentContext, Context.add(context, tag, service))
      self.run(nextEnv, onResult)
    })
)

/**
 * @since 3.2.0
 */
export const provideServiceEffect: {
  <I, S, E2, R2>(
    tag: Context.Tag<I, S>,
    acquire: Smol<S, E2, R2>
  ): <A, E, R>(self: Smol<A, E, R>) => Smol<A, E | E2, Exclude<R, I> | R2>
  <A, E, R, I, S, E2, R2>(
    self: Smol<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Smol<S, E2, R2>
  ): Smol<A, E | E2, Exclude<R, I> | R2>
} = dual(
  3,
  <A, E, R, I, S, E2, R2>(
    self: Smol<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Smol<S, E2, R2>
  ): Smol<A, E | E2, Exclude<R, I> | R2> => flatMap(acquire, (service) => provideService(self, tag, service))
)

/**
 * @since 3.2.0
 */
export const runPromise = <A, E>(effect: Smol<A, E>): Promise<A> =>
  new Promise((resolve, reject) =>
    effect.run(
      unsafeEmptyEnv(),
      Either.match({
        onLeft: (cause) => reject(failureSquash(cause)),
        onRight: resolve
      })
    )
  )

// Env

const EnvProto = {
  [EnvTypeId]: {
    _R: identity
  }
}

/**
 * @since 3.2.0
 */
export const unsafeMakeEnv = <R>(
  fiberRefs: ReadonlyMap<FiberRef<any>, unknown>
): Env<R> => {
  const self = Object.create(EnvProto)
  self.fiberRefs = fiberRefs
  return self
}

/**
 * @since 3.2.0
 */
export const unsafeEmptyEnv = (): Env<never> => {
  const controller = new AbortController()
  return unsafeMakeEnv(
    new Map<FiberRef<any>, unknown>([
      [currentAbortSignal, controller.signal],
      [currentAbortController, controller]
    ])
  )
}

/**
 * @since 3.2.0
 */
export const envGet = <R, A>(env: Env<R>, fiberRef: FiberRef<A>): A =>
  env.fiberRefs.get(fiberRef) as A ?? fiberRef.initial

/**
 * @since 3.2.0
 */
export const envSet = <R, A>(env: Env<R>, fiberRef: FiberRef<A>, value: A): Env<R> => {
  const map = new Map(env.fiberRefs)
  map.set(fiberRef, value)
  return unsafeMakeEnv(map)
}

// Fiber refs

export const currentAbortSignal: FiberRef<AbortSignal> = globalValue(
  "effect/Smol/currentAbortSignal",
  () => fiberRef.unsafeMake(new AbortController().signal)
)

export const currentAbortController: FiberRef<AbortController> = globalValue(
  "effect/Smol/currentAbortController",
  () => fiberRef.unsafeMake(new AbortController())
)
