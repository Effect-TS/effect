/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.2.0
 */
import * as Context from "./Context.js"
import * as Duration from "./Duration.js"
import * as Either from "./Either.js"
import { constVoid, dual, identity, type LazyArg } from "./Function.js"
import { SingleShotGen } from "./internal/singleShotGen.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import type { ReadonlyRecord } from "./Record.js"
import type { Concurrency, Covariant, NoInfer, NotFunction } from "./Types.js"
import { YieldWrap, yieldWrapGet } from "./Utils.js"

/**
 * @since 3.2.0
 */
export const TypeId: unique symbol = Symbol.for("effect/Micro")

/**
 * @since 3.2.0
 */
export type TypeId = typeof TypeId

/**
 * @since 3.2.0
 */
export const runSymbol: unique symbol = Symbol.for("effect/Micro/runSymbol")

/**
 * @since 3.2.0
 */
export type runSymbol = typeof runSymbol

/**
 * @since 3.2.0
 */
export interface Micro<out A, out E = never, out R = never> extends Pipeable {
  readonly [TypeId]: {
    _A: Covariant<A>
    _E: Covariant<E>
    _R: Covariant<R>
  }
  readonly [runSymbol]: (env: Env<any>, onResult: (result: Result<A, E>) => void) => void
  [Symbol.iterator](): MicroIterator<Micro<A, E, R>>
}

/**
 * @since 3.2.0
 */
export declare namespace Micro {
  /**
   * @since 3.2.0
   */
  export type Success<T> = T extends Micro<infer _A, infer _E, infer _R> ? _A : never
}

/**
 * @since 3.2.0
 */
export const isMicro = (u: unknown): u is Micro<any, any, any> => typeof u === "object" && u !== null && TypeId in u

/**
 * @since 3.2.0
 * @category models
 */
export interface MicroIterator<T extends Micro<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<YieldWrap<T>, Micro.Success<T>>
}

/**
 * @since 3.2.0
 */
export const EnvTypeId = Symbol.for("effect/Micro/Env")

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
  readonly refs: ReadonlyRecord<string, unknown>
}

/**
 * @since 3.2.0
 */
export const EnvRefTypeId: unique symbol = Symbol.for("effect/Micro/EnvRef")

/**
 * @since 3.2.0
 */
export type EnvRefTypeId = typeof EnvRefTypeId

/**
 * @since 3.2.0
 */
export interface EnvRef<A> {
  readonly [EnvRefTypeId]: EnvRefTypeId
  readonly key: string
  readonly initial: A
}

// Failures

/**
 * @since 3.2.0
 */
export const FailureTypeId = Symbol.for("effect/Micro/Failure")

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
export const HandleTypeId: unique symbol = Symbol.for("effect/Micro/Handle")

/**
 * @since 3.2.0
 */
export type HandleTypeId = typeof HandleTypeId

/**
 * @since 3.2.0
 */
export interface Handle<A, E = never> {
  readonly [HandleTypeId]: HandleTypeId
  readonly await: Micro<Result<A, E>>
  readonly join: Micro<A, E>
  readonly abort: Micro<void>
  readonly unsafeAbort: () => void
  readonly addObserver: (observer: (result: Result<A, E>) => void) => void
  readonly removeObserver: (observer: (result: Result<A, E>) => void) => void
  readonly unsafePoll: () => Result<A, E> | null
}

// Micro

const MicroProto: Omit<Micro<any, any, any>, runSymbol> = {
  [TypeId]: {
    _A: identity,
    _E: identity,
    _R: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Symbol.iterator]() {
    return new SingleShotGen(new YieldWrap(this)) as any
  }
}

const TagTypeId = Symbol.for("effect/Context/Tag")
const OptionTypeId = Symbol.for("effect/Option")

function run<A, E, R>(self: Micro<A, E, R>, env: Env<R>, onResult: (result: Result<any, any>) => void) {
  self[runSymbol](env, function(result) {
    if (TagTypeId in result) {
      // handle tags
      const context = envGet(env, currentContext)
      onResult(Either.right(Context.unsafeGet(context, result as any)))
    } else if (OptionTypeId in result) {
      // Option
      const o: any = result
      onResult(o._tag === "Some" ? Either.right(o.value) : Either.left(FailureExpected(Option.none())))
    } else if (result._tag === "Left" && !(FailureTypeId in result.left)) {
      // Either.Left
      onResult(Either.left(FailureExpected(result.left)))
    } else {
      onResult(result)
    }
  })
}

const unsafeMake = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Either.Either<A, Failure<E>>) => void) => void
): Micro<A, E, R> => {
  const self = Object.create(MicroProto)
  self[runSymbol] = run
  return self
}

const unsafeMakeNoAbort = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Either.Either<A, Failure<E>>) => void) => void
): Micro<A, E, R> =>
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
): Micro<A, E, R> =>
  unsafeMake(function(env: Env<R>, onResult: (result: Result<A, E>) => void) {
    if (envGet(env, currentInterruptible) && envGet(env, currentAbortSignal).aborted) {
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
export const succeed = <A>(a: A): Micro<A> =>
  make(function(_env, onResult) {
    onResult(Either.right(a))
  })

/**
 * @since 3.2.0
 */
export const fail = <E>(e: E): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(FailureExpected(e)))
  })

/**
 * @since 3.2.0
 */
export const failWith = <E>(failure: Failure<E>): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(failure))
  })

/**
 * @since 3.2.0
 */
export const sync = <A>(evaluate: LazyArg<A>): Micro<A> =>
  make(function(_env, onResult) {
    onResult(Either.right(evaluate()))
  })

/**
 * @since 3.2.0
 */
export const fromResult = <A, E>(self: Result<A, E>): Micro<A, E> =>
  make(function(_env, onResult) {
    onResult(self)
  })

/**
 * @since 3.2.0
 */
export const flatten = <A, E, R, E2, R2>(self: Micro<Micro<A, E, R>, E2, R2>): Micro<A, E | E2, R | R2> =>
  make(function(env, onResult) {
    run(
      self,
      env,
      (result) => result._tag === "Left" ? onResult(result as any) : run(result.right, env, onResult)
    )
  })

/**
 * @since 3.2.0
 */
export const suspend = <A, E, R>(evaluate: LazyArg<Micro<A, E, R>>): Micro<A, E, R> =>
  make(function(env, onResult) {
    run(evaluate(), env, onResult)
  })

const void_: Micro<void> = succeed(void 0)
export {
  /**
   * @since 3.2.0
   */
  void_ as void
}

/**
 * @since 3.2.0
 */
export const map: {
  <A, B>(f: (a: NoInfer<A>) => B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, f: (a: NoInfer<A>) => B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, f: (a: A) => B): Micro<B, E, R> =>
  make(function(env, onResult) {
    run(self, env, function(result) {
      onResult(Either.map(result, f))
    })
  }))

/**
 * @since 3.2.0
 */
export const as: {
  <A, B>(value: B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R> => map(self, (_) => value))

/**
 * @since 3.2.0
 */
export const flatMap: {
  <A, B, E2, R2>(f: (a: NoInfer<A>) => Micro<B, E2, R2>): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<A>) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      run(self, env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        run(f(result.right), env, onResult)
      })
    })
)

/**
 * @since 3.2.0
 */
export const andThen: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: any): Micro<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      run(self, env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(result.right) : f
        if (isMicro(value)) {
          run(value, env, onResult)
        } else {
          onResult(Either.right(value))
        }
      })
    })
)

/**
 * @since 3.2.0
 */
export const tap: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    make(function(env, onResult) {
      run(self, env, function(selfResult) {
        if (selfResult._tag === "Left") {
          return onResult(selfResult as any)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(selfResult.right) : f
        if (isMicro(value)) {
          run(value, env, function(tapResult) {
            if (tapResult._tag === "Left") {
              return onResult(tapResult)
            }
            onResult(selfResult)
          })
        } else {
          onResult(selfResult)
        }
      })
    })
)

/**
 * @since 3.2.0
 */
export const asVoid = <A, E, R>(self: Micro<A, E, R>): Micro<void, E, R> => map(self, (_) => undefined)

/**
 * @since 3.2.0
 */
export const zipRight: {
  <A, B, E2, R2>(that: Micro<B, E2, R2>): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, that: Micro<B, E2, R2>): Micro<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, that: Micro<B, E2, R2>): Micro<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      run(self, env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        run(that, env, onResult)
      })
    })
)

/**
 * @since 3.2.0
 */
export const async = <A, E = never, R = never>(
  register: (resume: (effect: Micro<A, E, R>) => void, signal: AbortSignal) => void | Micro<void, never, R>
): Micro<A, E, R> =>
  flatten(
    make(function(env, onResult) {
      let resumed = false
      let onAbort: LazyArg<void> | undefined = undefined
      const signal = envGet(env, currentAbortSignal)
      function resume(effect: Micro<A, E, R>) {
        if (resumed) {
          return
        }
        resumed = true
        if (onAbort !== undefined) {
          signal.removeEventListener("abort", onAbort)
        }
        onResult(Either.right(effect))
      }
      const cleanup = register(resume, signal)
      if (cleanup) {
        onAbort = function() {
          resume(uninterruptible(zipRight(cleanup, failWith(FailureAborted))))
        }
        signal.addEventListener("abort", onAbort)
      }
    })
  )

/**
 * @since 3.2.0
 */
export const never: Micro<never> = async<never>(function() {
  const interval = setInterval(constVoid, 2147483646)
  return sync(() => clearInterval(interval))
})

/**
 * @since 3.2.0
 */
export const sleep = (duration: Duration.DurationInput): Micro<void> => {
  const millis = Duration.toMillis(duration)
  return async(function(resume) {
    const timeout = setTimeout(function() {
      resume(void_)
    }, millis)
    return sync(() => clearTimeout(timeout))
  })
}

/**
 * @since 3.2.0
 */
export const delay: {
  (duration: Duration.DurationInput): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<A, E, R> => zipRight(sleep(duration), self)
)

/**
 * @since 3.2.0
 */
export const asResult = <A, E, R>(self: Micro<A, E, R>): Micro<Result<A, E>, never, R> =>
  make(function(env, onResult) {
    run(self, env, function(result) {
      onResult(Either.right(result))
    })
  })

/**
 * @since 3.2.0
 */
export const onResult: {
  <A, E, XE, XR>(
    f: (result: Result<A, E>) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, f: (result: Result<A, E>) => Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Micro<A, E, R>, f: (result: Result<A, E>) => Micro<void, XE, XR>): Micro<A, E | XE, R | XR> =>
    uninterruptibleMask((restore) =>
      flatMap(asResult(restore(self)), (result) => zipRight(f(result), fromResult(result)))
    )
)

/**
 * @since 3.2.0
 */
export const acquireUseRelease = <Resource, E, R, A, E2, R2, R3>(
  acquire: Micro<Resource, E, R>,
  use: (a: Resource) => Micro<A, E2, R2>,
  release: (a: Resource, result: Result<A, E2>) => Micro<void, never, R3>
): Micro<A, E | E2, R | R2 | R3> =>
  uninterruptibleMask((restore) =>
    flatMap(
      acquire,
      (a) =>
        flatMap(
          asResult(restore(use(a))),
          (result) => zipRight(release(a, result), fromResult(result))
        )
    )
  )

/**
 * @since 3.2.0
 */
export const envRefGet = <A>(fiberRef: EnvRef<A>): Micro<A> =>
  make((env, onResult) => onResult(Either.right(envGet(env, fiberRef))))

/**
 * @since 3.2.0
 */
export const locally: {
  <A>(fiberRef: EnvRef<A>, value: A): <XA, E, R>(self: Micro<XA, E, R>) => Micro<XA, E, R>
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R>
} = dual(
  3,
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R> =>
    make((env, onResult) => run(self, envSet(env, fiberRef, value), onResult))
)

/**
 * @since 3.2.0
 */
export const context = <R>(): Micro<R, never, R> => envRefGet(currentContext) as any

/**
 * @since 3.2.0
 */
export const uninterruptible = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, R> =>
  unsafeMakeNoAbort(function(env, onResult) {
    const nextEnv = envMutate(env, function(env) {
      env[currentInterruptible.key] = false
      env[currentAbortSignal.key] = new AbortController().signal
      return env
    })
    run(self, nextEnv, onResult)
  })

/**
 * @since 3.2.0
 */
export const uninterruptibleMask = <A, E, R>(
  f: (restore: <A, E, R>(effect: Micro<A, E, R>) => Micro<A, E, R>) => Micro<A, E, R>
): Micro<A, E, R> =>
  unsafeMakeNoAbort((env, onResult) => {
    const isInterruptible = envGet(env, currentInterruptible)
    const effect = isInterruptible ? f(interruptible) : f(identity)
    const nextEnv = isInterruptible ?
      envMutate(env, function(env) {
        env[currentInterruptible.key] = false
        env[currentAbortSignal.key] = new AbortController().signal
        return env
      }) :
      env
    run(effect, nextEnv, onResult)
  })

/**
 * @since 3.2.0
 */
export const interruptible = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, R> =>
  make((env, onResult) => {
    const isInterruptible = envGet(env, currentInterruptible)
    let newEnv = env
    if (!isInterruptible) {
      const controller = envGet(env, currentAbortController)
      newEnv = envMutate(env, function(env) {
        env[currentInterruptible.key] = true
        env[currentAbortSignal.key] = controller.signal
        return env
      })
    }
    run(self, newEnv, onResult)
  })

/**
 * @since 3.2.0
 */
export const provideService: {
  <I, S>(tag: Context.Tag<I, S>, service: S): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, Exclude<R, I>>
  <A, E, R, I, S>(self: Micro<A, E, R>, tag: Context.Tag<I, S>, service: S): Micro<A, E, Exclude<R, I>>
} = dual(
  3,
  <A, E, R, I, S>(self: Micro<A, E, R>, tag: Context.Tag<I, S>, service: S): Micro<A, E, Exclude<R, I>> =>
    make(function(env, onResult) {
      const context = envGet(env, currentContext)
      const nextEnv = envSet(env, currentContext, Context.add(context, tag, service))
      run(self, nextEnv, onResult)
    })
)

/**
 * @since 3.2.0
 */
export const provideServiceEffect: {
  <I, S, E2, R2>(
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | E2, Exclude<R, I> | R2>
  <A, E, R, I, S, E2, R2>(
    self: Micro<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): Micro<A, E | E2, Exclude<R, I> | R2>
} = dual(
  3,
  <A, E, R, I, S, E2, R2>(
    self: Micro<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): Micro<A, E | E2, Exclude<R, I> | R2> => flatMap(acquire, (service) => provideService(self, tag, service))
)

export const gen = <Eff extends YieldWrap<Micro<any, any, any>>, AEff>(
  f: (_: any) => Generator<Eff, AEff, never>
): Micro<
  AEff,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer E, infer _R>>] ? E : never,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer _E, infer R>>] ? R : never
> =>
  suspend(function() {
    const iterator = f(undefined) as any
    function run(state: IteratorResult<any>): Micro<any, any, any> {
      return state.done
        ? succeed(state.value)
        : flatMap(yieldWrapGet(state.value) as any, (val: any) => run(iterator.next(val)))
    }
    return run(iterator.next())
  })

// ========================================================================
// Collecting
// ========================================================================

/**
 * @since 3.2.0
 */
export const forEach: {
  <A, B, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<B, E, R>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: false | undefined
  }): Micro<Array<B>, E, R>
  <A, B, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<B, E, R>, options: {
    readonly concurrency?: Concurrency | undefined
    readonly discard: true
  }): Micro<void, E, R>
} = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<B, E, R>, options?: {
  readonly concurrency?: Concurrency | undefined
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  make(function(env, onResult) {
    const concurrency = options?.concurrency === "inherit" ? envGet(env, currentConcurrency) : options?.concurrency ?? 1
    if (concurrency === "unbounded" || concurrency > 1) {
      run(
        forEachConcurrent(iterable, f, {
          discard: options?.discard,
          concurrency
        }),
        env,
        onResult
      )
    } else {
      run(unsafeForEachSequential(iterable, f, options), env, onResult)
    }
  })

const unsafeForEachSequential = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<B, E, R>, options?: {
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  make(function(env, onResult) {
    const items = Array.from(iterable)
    const length = items.length
    const out: Array<B> | undefined = options?.discard ? undefined : new Array(length)
    let index = 0
    let running = false
    function tick(): void {
      running = true
      while (index < length) {
        let complete = false
        const current = index++
        try {
          run(f(items[current]), env, function(result) {
            complete = true
            if (result._tag === "Left") {
              index = length
              onResult(result)
            } else if (out !== undefined) {
              out[current] = result.right
            }
            if (current === length - 1) {
              onResult(Either.right(out))
            } else if (!running) {
              tick()
            }
          })
        } catch (err) {
          onResult(Either.left(FailureUnexpected(err)))
          break
        }
        if (!complete) {
          break
        }
      }
      running = false
    }
    tick()
  })

const forEachConcurrent = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<B, E, R>, options: {
  readonly concurrency: number | "unbounded"
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  unsafeMake(function(env, onResult) {
    // abort
    const controller = new AbortController()
    const parentSignal = envGet(env, currentAbortSignal)
    function onAbort() {
      length = index
      controller.abort()
      parentSignal.removeEventListener("abort", onAbort)
    }
    parentSignal.addEventListener("abort", onAbort)
    const envWithSignal = envSet(env, currentAbortSignal, controller.signal)

    // iterate
    const concurrency = options.concurrency === "unbounded" ? Infinity : options.concurrency
    let failure: Result<any, any> | undefined = undefined
    const items = Array.from(iterable)
    let length = items.length
    const out: Array<B> | undefined = options?.discard ? undefined : new Array(length)
    let index = 0
    let inProgress = 0
    let doneCount = 0
    let pumping = false
    function pump() {
      pumping = true
      while (inProgress < concurrency && index < length) {
        const currentIndex = index
        const item = items[currentIndex]
        index++
        inProgress++
        try {
          run(f(item), envWithSignal, function(result) {
            doneCount++
            inProgress--
            if (result._tag === "Left") {
              if (failure === undefined) {
                failure = result
                onAbort()
              }
            } else if (out !== undefined) {
              out[currentIndex] = result.right
            }
            if (doneCount === length) {
              parentSignal.removeEventListener("abort", onAbort)
              onResult(failure ?? Either.right(out))
            } else if (!pumping && inProgress < concurrency) {
              pump()
            }
          })
        } catch (err) {
          failure = Either.left(FailureUnexpected(err))
          onAbort()
        }
      }
      pumping = false
    }
    pump()
  })

class HandleImpl<A, E> implements Handle<A, E> {
  readonly [HandleTypeId]: HandleTypeId

  readonly observers: Set<(result: Result<A, E>) => void> = new Set()
  private _result: Result<A, E> | undefined = undefined
  _controller: AbortController
  readonly isRoot: boolean

  constructor(readonly parentSignal: AbortSignal, controller?: AbortController) {
    this[HandleTypeId] = HandleTypeId
    this.isRoot = controller !== undefined
    this._controller = controller ?? new AbortController()
    if (!this.isRoot) {
      parentSignal.addEventListener("abort", this.unsafeAbort)
    }
  }

  unsafePoll(): Result<A, E> | null {
    return this._result ?? null
  }

  unsafeAbort = () => {
    this._controller.abort()
  }

  emit(result: Result<A, E>): void {
    if (this._result) {
      return
    }
    this._result = result
    if (!this.isRoot) {
      this.parentSignal.removeEventListener("abort", this.unsafeAbort)
    }
    this._controller.abort()
    this.observers.forEach((observer) => observer(result))
    this.observers.clear()
  }

  addObserver(observer: (result: Result<A, E>) => void): void {
    if (this._result) {
      return observer(this._result)
    }
    this.observers.add(observer)
  }

  removeObserver(observer: (result: Result<A, E>) => void): void {
    this.observers.delete(observer)
  }

  get await(): Micro<Result<A, E>> {
    return suspend(() => {
      if (this._result) {
        return succeed(this._result)
      }
      return async((resume) => {
        function observer(result: Result<A, E>) {
          resume(succeed(result))
        }
        this.addObserver(observer)
        return sync(() => {
          this.removeObserver(observer)
        })
      })
    })
  }

  get join(): Micro<A, E> {
    return suspend(() => {
      if (this._result) {
        return fromResult(this._result)
      }
      return async((resume) => {
        function observer(result: Result<A, E>) {
          resume(fromResult(result))
        }
        this.addObserver(observer)
        return sync(() => {
          this.removeObserver(observer)
        })
      })
    })
  }

  get abort(): Micro<void> {
    return suspend(() => {
      this.unsafeAbort()
      return asVoid(this.await)
    })
  }
}

/**
 * @since 3.2.0
 */
export const fork = <A, E, R>(self: Micro<A, E, R>): Micro<Handle<A, E>, never, R> =>
  make(function(env, onResult) {
    const signal = envGet(env, currentAbortSignal)
    const handle = new HandleImpl<A, E>(signal)
    const nextEnv = envMutate(env, (map) => {
      map[currentAbortController.key] = handle._controller
      map[currentAbortSignal.key] = handle._controller.signal
      return map
    })
    Promise.resolve().then(() => {
      run(self, nextEnv, (result) => {
        handle.emit(result)
      })
      onResult(Either.right(handle))
    })
  })

/**
 * @since 3.2.0
 */
export const forkDaemon = <A, E, R>(self: Micro<A, E, R>): Micro<Handle<A, E>, never, R> =>
  make(function(env, onResult) {
    const controller = new AbortController()
    const handle = new HandleImpl<A, E>(controller.signal, controller)
    const nextEnv = envMutate(env, (map) => {
      map[currentAbortController.key] = controller
      map[currentAbortSignal.key] = controller.signal
      return map
    })
    Promise.resolve().then(() => {
      run(self, nextEnv, (result) => {
        handle.emit(result)
      })
      onResult(Either.right(handle))
    })
  })

/**
 * @since 3.2.0
 */
export const runFork = <A, E>(effect: Micro<A, E>): Handle<A, E> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  const env = makeEnv(refs)
  const handle = new HandleImpl<A, E>(controller.signal, controller)
  run(effect, envSet(env, currentAbortSignal, handle._controller.signal), (result) => {
    handle.emit(result)
  })
  return handle
}

/**
 * @since 3.2.0
 */
export const runPromise = <A, E>(effect: Micro<A, E>): Promise<A> =>
  new Promise((resolve, reject) => {
    const handle = runFork(effect)
    handle.addObserver((result) => {
      if (result._tag === "Left") {
        reject(failureSquash(result.left))
      } else {
        resolve(result.right)
      }
    })
  })

// ========================================================================
// Scope
// ========================================================================

/**
 * @since 3.2.0
 */
export const ScopeTypeId: unique symbol = Symbol.for("effect/Micro/Scope")

/**
 * @since 3.2.0
 */
export type ScopeTypeId = typeof ScopeTypeId

/**
 * @since 3.2.0
 */
export interface Scope {
  readonly [ScopeTypeId]: ScopeTypeId
  readonly addFinalizer: (finalizer: (result: Result<any, any>) => Micro<void>) => Micro<void>
  readonly fork: Micro<Scope.Closeable>
}

/**
 * @since 3.2.0
 */
export declare namespace Scope {
  /**
   * @since 3.2.0
   */
  export interface Closeable extends Scope {
    readonly close: (result: Result<any, any>) => Micro<void>
  }
}

/**
 * @since 3.2.0
 */
export const Scope: Context.Tag<Scope, Scope> = Context.GenericTag<Scope>("effect/Micro/Scope")

class ScopeImpl implements Scope.Closeable {
  readonly [ScopeTypeId]: ScopeTypeId
  state: {
    readonly _tag: "Open"
    readonly finalizers: Set<(result: Result<any, any>) => Micro<void>>
  } | {
    readonly _tag: "Closed"
    readonly result: Result<any, any>
  } = { _tag: "Open", finalizers: new Set() }

  constructor() {
    this[ScopeTypeId] = ScopeTypeId
  }

  unsafeAddFinalizer(finalizer: (result: Result<any, any>) => Micro<void>): void {
    if (this.state._tag === "Open") {
      this.state.finalizers.add(finalizer)
    }
  }
  addFinalizer(finalizer: (result: Result<any, any>) => Micro<void>): Micro<void> {
    return suspend(() => {
      if (this.state._tag === "Open") {
        this.state.finalizers.add(finalizer)
        return void_
      }
      return finalizer(this.state.result)
    })
  }
  unsafeRemoveFinalizer(finalizer: (result: Result<any, any>) => Micro<void>): void {
    if (this.state._tag === "Open") {
      this.state.finalizers.delete(finalizer)
    }
  }
  close(result: Result<any, any>): Micro<void> {
    return suspend(() => {
      if (this.state._tag === "Open") {
        const finalizers = Array.from(this.state.finalizers).reverse()
        this.state = { _tag: "Closed", result }
        return flatMap(
          forEach(finalizers, (finalizer) => asResult(finalizer(result))),
          (results) => asVoid(fromResult(Either.all(results)))
        )
      }
      return void_
    })
  }
  get fork() {
    return sync(() => {
      const newScope = new ScopeImpl()
      if (this.state._tag === "Closed") {
        newScope.state = this.state
        return newScope
      }
      function fin(result: Result<any, any>) {
        return newScope.close(result)
      }
      this.state.finalizers.add(fin)
      newScope.unsafeAddFinalizer((_) => sync(() => this.unsafeRemoveFinalizer(fin)))
      return newScope
    })
  }
}

/**
 * @since 3.2.0
 */
export const makeScope = (): Micro<Scope.Closeable> => sync(() => new ScopeImpl())

/**
 * @since 3.2.0
 */
export const scoped = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, Exclude<R, Scope>> =>
  suspend(function() {
    const scope = new ScopeImpl()
    return onResult(provideService(self, Scope, scope), (result) => scope.close(result))
  })

/**
 * @since 3.2.0
 */
export const acquireRelease = <A, E, R>(
  acquire: Micro<A, E, R>,
  release: (a: A, result: Result<any, any>) => Micro<void>
): Micro<A, E, R | Scope> =>
  uninterruptible(flatMap(
    Scope,
    (scope) =>
      tap(
        acquire,
        (a) => scope.addFinalizer((result) => release(a, result))
      )
  ))

// ========================================================================
// Env
// ========================================================================

const EnvProto = {
  [EnvTypeId]: {
    _R: identity
  }
}

/**
 * @since 3.2.0
 */
export const makeEnv = <R = never>(
  refs: Record<string, unknown>
): Env<R> => {
  const self = Object.create(EnvProto)
  self.refs = refs
  return self
}

/**
 * @since 3.2.0
 */
export const unsafeEmptyEnv = (): Env<never> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  return makeEnv(refs)
}

/**
 * @since 3.2.0
 */
export const envGet = <R, A>(env: Env<R>, ref: EnvRef<A>): A => env.refs[ref.key] as A ?? ref.initial

/**
 * @since 3.2.0
 */
export const envSet = <R, A>(env: Env<R>, ref: EnvRef<A>, value: A): Env<R> => {
  const refs = Object.assign(Object.create(null), env.refs)
  refs[ref.key] = value
  return makeEnv(refs)
}

/**
 * @since 3.2.0
 */
export const envMutate = <R>(
  env: Env<R>,
  f: (map: Record<string, unknown>) => ReadonlyRecord<string, unknown>
): Env<R> => makeEnv(f(Object.assign(Object.create(null), env.refs)))

// ========================================================================
// Env refs
// ========================================================================

const EnvRefProto = {
  [EnvRefTypeId]: EnvRefTypeId
}

/**
 * @since 3.2.0
 */
export const makeEnvRef = <A>(key: string, initial: A): EnvRef<A> => {
  const self = Object.create(EnvRefProto)
  self.key = key
  self.initial = initial
  return self
}

/**
 * @since 3.2.0
 */
export const currentAbortController: EnvRef<AbortController> = makeEnvRef(
  "effect/Micro/currentAbortController",
  new AbortController()
)

/**
 * @since 3.2.0
 */
export const currentAbortSignal: EnvRef<AbortSignal> = makeEnvRef(
  "effect/Micro/currentAbortSignal",
  currentAbortController.initial.signal
)

/**
 * @since 3.2.0
 */
export const currentContext: EnvRef<Context.Context<never>> = makeEnvRef(
  "effect/Micro/currentContext",
  Context.empty()
)

const currentInterruptible: EnvRef<boolean> = makeEnvRef(
  "effect/Micro/currentInterruptible",
  true
)

/**
 * @since 3.2.0
 */
export const currentConcurrency: EnvRef<"unbounded" | number> = makeEnvRef(
  "effect/Micro/currentConcurrency",
  "unbounded"
)

/**
 * @since 3.2.0
 */
export const withConcurrency: {
  (concurrency: "unbounded" | number): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R> =>
    locally(self, currentConcurrency, concurrency)
)
