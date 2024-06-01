/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.3.0
 */
import type * as Channel from "./Channel.js"
import * as Context from "./Context.js"
import * as Duration from "./Duration.js"
import type { Effect, EffectTypeId } from "./Effect.js"
import * as Effectable from "./Effectable.js"
import * as Either from "./Either.js"
import { constVoid, dual, identity, type LazyArg } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import type { Inspectable } from "./Inspectable.js"
import { NodeInspectSymbol } from "./Inspectable.js"
import { StructuralPrototype } from "./internal/effectable.js"
import { SingleShotGen } from "./internal/singleShotGen.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { isIterable, isTagged, type Predicate, type Refinement } from "./Predicate.js"
import type { ReadonlyRecord } from "./Record.js"
import type * as Sink from "./Sink.js"
import type * as Stream from "./Stream.js"
import type { Concurrency, Covariant, Equals, NoInfer, NotFunction } from "./Types.js"
import { YieldWrap, yieldWrapGet } from "./Utils.js"

/**
 * @since 3.3.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/Micro")

/**
 * @since 3.3.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.3.0
 * @category symbols
 */
export const runSymbol: unique symbol = Symbol.for("effect/Micro/runSymbol")

/**
 * @since 3.3.0
 * @category symbols
 */
export type runSymbol = typeof runSymbol

/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.3.0
 * @category models
 */
export interface Micro<out A, out E = never, out R = never> extends Effect<A, E, R> {
  readonly [TypeId]: Micro.Variance<A, E, R>
  readonly [runSymbol]: (env: Env<any>, onResult: (result: Result<A, E>) => void) => void
  [Symbol.iterator](): MicroIterator<Micro<A, E, R>>
}

/**
 * @since 3.3.0
 */
export declare namespace Micro {
  /**
   * @since 3.3.0
   */
  export interface Variance<A, E, R> {
    _A: Covariant<A>
    _E: Covariant<E>
    _R: Covariant<R>
  }

  /**
   * @since 3.3.0
   */
  export type Success<T> = T extends Micro<infer _A, infer _E, infer _R> ? _A : never

  /**
   * @since 3.3.0
   */
  export type Error<T> = T extends Micro<infer _A, infer _E, infer _R> ? _E : never

  /**
   * @since 3.3.0
   */
  export type Context<T> = T extends Micro<infer _A, infer _E, infer _R> ? _R : never
}

/**
 * @since 3.3.0
 */
export const isMicro = (u: unknown): u is Micro<any, any, any> => typeof u === "object" && u !== null && TypeId in u

/**
 * @since 3.3.0
 * @category models
 */
export interface MicroIterator<T extends Micro<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<YieldWrap<T>, Micro.Success<T>>
}

// ----------------------------------------------------------------------------
// Failures
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category failure
 */
export const FailureTypeId = Symbol.for("effect/Micro/Failure")

/**
 * @since 3.3.0
 * @category failure
 */
export type FailureTypeId = typeof FailureTypeId

/**
 * @since 3.3.0
 * @category failure
 */
export type Failure<E> = Failure.Unexpected | Failure.Expected<E> | Failure.Aborted

/**
 * @since 3.3.0
 * @category failure
 */
export declare namespace Failure {
  /**
   * @since 3.3.0
   */
  export interface Proto extends Pipeable {
    readonly [FailureTypeId]: FailureTypeId
  }

  /**
   * @since 3.3.0
   * @category failure
   */
  export interface Unexpected extends Proto {
    readonly _tag: "Unexpected"
    readonly defect: unknown
  }

  /**
   * @since 3.3.0
   * @category failure
   */
  export interface Expected<E> extends Proto {
    readonly _tag: "Expected"
    readonly error: E
  }

  /**
   * @since 3.3.0
   * @category failure
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
 * @since 3.3.0
 * @category failure
 */
export const FailureExpected = <E>(error: E): Failure<E> => {
  const self = Object.create(FailureProto)
  self._tag = "Expected"
  self.error = error
  return self
}

/**
 * @since 3.3.0
 * @category failure
 */
export const FailureUnexpected = (defect: unknown): Failure<never> => {
  const self = Object.create(FailureProto)
  self._tag = "Unexpected"
  self.defect = defect
  return self
}

/**
 * @since 3.3.0
 * @category failure
 */
export const FailureAborted: Failure<never> = Object.assign(Object.create(FailureProto), {
  _tag: "Aborted"
})

/**
 * @since 3.3.0
 * @category failure
 */
export const failureSquash = <E>(self: Failure<E>): unknown =>
  self._tag === "Expected" ? self.error : self._tag === "Unexpected" ? self.defect : self

// ----------------------------------------------------------------------------
// Result
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category result
 */
export type Result<A, E = never> = Either.Either<A, Failure<E>>

/**
 * @since 3.3.0
 * @category result
 */
export const ResultAborted: Result<never> = Either.left(FailureAborted)

/**
 * @since 3.3.0
 * @category result
 */
export const ResultSucceed = <A>(a: A): Result<A> => Either.right(a)

/**
 * @since 3.3.0
 * @category result
 */
export const ResultFail = <E>(e: E): Result<never, E> => Either.left(FailureExpected(e))

/**
 * @since 3.3.0
 * @category result
 */
export const ResultFailUnexpected = (defect: unknown): Result<never> => Either.left(FailureUnexpected(defect))

/**
 * @since 3.3.0
 * @category result
 */
export const ResultFailWith = <E>(failure: Failure<E>): Result<never, E> => Either.left(failure)

// ----------------------------------------------------------------------------
// env
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category environment
 */
export const EnvTypeId = Symbol.for("effect/Micro/Env")

/**
 * @since 3.3.0
 * @category environment
 */
export type EnvTypeId = typeof EnvTypeId

/**
 * @since 3.3.0
 * @category environment
 */
export interface Env<R> {
  readonly [EnvTypeId]: {
    _R: Covariant<R>
  }
  readonly refs: ReadonlyRecord<string, unknown>
}

/**
 * @since 3.3.0
 * @category environment
 */
export const EnvRefTypeId: unique symbol = Symbol.for("effect/Micro/EnvRef")

/**
 * @since 3.3.0
 * @category environment
 */
export type EnvRefTypeId = typeof EnvRefTypeId

/**
 * @since 3.3.0
 * @category environment
 */
export interface EnvRef<A> {
  readonly [EnvRefTypeId]: EnvRefTypeId
  readonly key: string
  readonly initial: A
}

const EnvProto = {
  [EnvTypeId]: {
    _R: identity
  }
}

/**
 * @since 3.3.0
 * @category environment
 */
export const envMake = <R = never>(
  refs: Record<string, unknown>
): Env<R> => {
  const self = Object.create(EnvProto)
  self.refs = refs
  return self
}

/**
 * @since 3.3.0
 * @category environment
 */
export const envUnsafeMakeEmpty = (): Env<never> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  return envMake(refs)
}

/**
 * @since 3.3.0
 * @category environment
 */
export const envGet = <R, A>(env: Env<R>, ref: EnvRef<A>): A => env.refs[ref.key] as A ?? ref.initial

/**
 * @since 3.3.0
 * @category environment
 */
export const envSet = <R, A>(env: Env<R>, ref: EnvRef<A>, value: A): Env<R> => {
  const refs = Object.assign(Object.create(null), env.refs)
  refs[ref.key] = value
  return envMake(refs)
}

/**
 * @since 3.3.0
 * @category environment
 */
export const envMutate = <R>(
  env: Env<R>,
  f: (map: Record<string, unknown>) => ReadonlyRecord<string, unknown>
): Env<R> => envMake(f(Object.assign(Object.create(null), env.refs)))

// ========================================================================
// Env refs
// ========================================================================

const EnvRefProto = {
  [EnvRefTypeId]: EnvRefTypeId
}

/**
 * @since 3.3.0
 * @category environment refs
 */
export const envRefMake = <A>(key: string, initial: LazyArg<A>): EnvRef<A> =>
  globalValue(key, () => {
    const self = Object.create(EnvRefProto)
    self.key = key
    self.initial = initial
    return self
  })

/**
 * @since 3.3.0
 * @category environment refs
 */
export const currentAbortController: EnvRef<AbortController> = envRefMake(
  "effect/Micro/currentAbortController",
  () => new AbortController()
)

/**
 * @since 3.3.0
 * @category environment refs
 */
export const currentAbortSignal: EnvRef<AbortSignal> = envRefMake(
  "effect/Micro/currentAbortSignal",
  () => currentAbortController.initial.signal
)

/**
 * @since 3.3.0
 * @category environment refs
 */
export const currentContext: EnvRef<Context.Context<never>> = envRefMake(
  "effect/Micro/currentContext",
  () => Context.empty()
)

/**
 * @since 3.3.0
 * @category environment refs
 */
export const currentConcurrency: EnvRef<"unbounded" | number> = envRefMake(
  "effect/Micro/currentConcurrency",
  () => "unbounded"
)

const currentInterruptible: EnvRef<boolean> = envRefMake(
  "effect/Micro/currentInterruptible",
  () => true
)

/**
 * @since 3.3.0
 * @category env refs
 */
export const withConcurrency: {
  (concurrency: "unbounded" | number): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R> =>
    locally(self, currentConcurrency, concurrency)
)

// ----------------------------------------------------------------------------
// constructors
// ----------------------------------------------------------------------------

const MicroProto = {
  ...Effectable.EffectPrototype,
  _op: "Micro",
  [TypeId]: {
    _A: identity,
    _E: identity,
    _R: identity
  },
  [Symbol.iterator]() {
    return new SingleShotGen(new YieldWrap(this)) as any
  }
}

const unsafeMake = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Result<A, E>) => void) => void
): Micro<A, E, R> => {
  const self = Object.create(MicroProto)
  self[runSymbol] = run
  return self
}

const unsafeMakeNoAbort = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Result<A, E>) => void) => void
): Micro<A, E, R> =>
  unsafeMake(function(env, onResult) {
    try {
      run(env, onResult)
    } catch (err) {
      onResult(Either.left(FailureUnexpected(err)))
    }
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const make = <A, E, R>(
  run: (env: Env<R>, onResult: (result: Result<A, E>) => void) => void
): Micro<A, E, R> =>
  unsafeMake(function(env: Env<R>, onResult: (result: Result<A, E>) => void) {
    if (env.refs[currentInterruptible.key] !== false && (env.refs[currentAbortSignal.key] as AbortSignal).aborted) {
      return onResult(ResultAborted)
    }
    try {
      run(env, onResult)
    } catch (err) {
      onResult(ResultFailUnexpected(err))
    }
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const succeed = <A>(a: A): Micro<A> =>
  make(function(_env, onResult) {
    onResult(ResultSucceed(a))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const fail = <E>(e: E): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(FailureExpected(e)))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const failSync = <E>(e: LazyArg<E>): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(FailureExpected(e())))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const die = (defect: unknown): Micro<never> =>
  make(function(_env, onResult) {
    onResult(Either.left(FailureUnexpected(defect)))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const failWith = <E>(failure: Failure<E>): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(failure))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const failWithSync = <E>(failure: LazyArg<Failure<E>>): Micro<never, E> =>
  make(function(_env, onResult) {
    onResult(Either.left(failure()))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const sync = <A>(evaluate: LazyArg<A>): Micro<A> =>
  make(function(_env, onResult) {
    onResult(Either.right(evaluate()))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const fromResult = <A, E>(self: Result<A, E>): Micro<A, E> =>
  make(function(_env, onResult) {
    onResult(self)
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const service = <I, S>(tag: Context.Tag<I, S>): Micro<S, never, I> =>
  make(function(env, onResult) {
    onResult(Either.right(Context.get(envGet(env, currentContext) as Context.Context<I>, tag as any) as S))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const serviceOption = <I, S>(tag: Context.Tag<I, S>): Micro<Option.Option<S>> =>
  make(function(env, onResult) {
    onResult(ResultSucceed(Context.getOption(envGet(env, currentContext) as Context.Context<I>, tag)))
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const fromOption = <A>(option: Option.Option<A>): Micro<A, Option.None<never>> =>
  make(function(_env, onResult) {
    onResult(option._tag === "Some" ? Either.right(option.value) : Either.left(FailureExpected(Option.none())) as any)
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const fromEither = <R, L>(either: Either.Either<R, L>): Micro<R, L> =>
  make(function(_env, onResult) {
    onResult(either._tag === "Right" ? either : Either.left(FailureExpected(either.left)) as any)
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const suspend = <A, E, R>(evaluate: LazyArg<Micro<A, E, R>>): Micro<A, E, R> =>
  make(function(env, onResult) {
    evaluate()[runSymbol](env, onResult)
  })

const void_: Micro<void> = succeed(void 0)
export {
  /**
   * @since 3.3.0
   * @category constructors
   */
  void_ as void
}

/**
 * @since 3.3.0
 * @category constructors
 */
export const async = <A, E = never, R = never>(
  register: (resume: (effect: Micro<A, E, R>) => void, signal: AbortSignal) => void | Micro<void, never, R>
): Micro<A, E, R> =>
  make(function(env, onResult) {
    let resumed = false
    const signal = envGet(env, currentAbortSignal)
    let cleanup: Micro<void, never, R> | void = undefined
    function onAbort() {
      if (cleanup) {
        resume(uninterruptible(andThen(cleanup, failWith(FailureAborted))))
      } else {
        resume(failWith(FailureAborted))
      }
    }
    function resume(effect: Micro<A, E, R>) {
      if (resumed) {
        return
      }
      resumed = true
      signal.removeEventListener("abort", onAbort)
      effect[runSymbol](env, onResult)
    }
    cleanup = register(resume, signal)
    if (resumed) return
    signal.addEventListener("abort", onAbort)
  })

const try_ = <A, E>(options: {
  try: LazyArg<A>
  catch: (error: unknown) => E
}): Micro<A, E> =>
  make(function(_env, onResult) {
    try {
      onResult(ResultSucceed(options.try()))
    } catch (err) {
      onResult(ResultFail(options.catch(err)))
    }
  })
export {
  /**
   * @since 3.3.0
   * @category constructors
   */
  try_ as try
}

/**
 * @since 3.3.0
 * @category constructors
 */
export const promise = <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Micro<A> =>
  async<A>(function(resume, signal) {
    evaluate(signal).then(
      (a) => resume(succeed(a)),
      (e) => resume(die(e))
    )
  })

/**
 * @since 3.3.0
 * @category constructors
 */
export const tryPromise = <A, E>(options: {
  readonly try: (signal: AbortSignal) => PromiseLike<A>
  readonly catch: (error: unknown) => E
}): Micro<A, E> =>
  async<A, E>(function(resume, signal) {
    options.try(signal).then(
      (a) => resume(succeed(a)),
      (e) => resume(fail(options.catch(e)))
    )
  })

const yieldState: {
  tasks: Array<() => void>
  working: boolean
} = globalValue("effect/Micro/yieldState", () => ({
  tasks: [],
  working: false
}))

const yieldFlush = () => {
  const tasks = yieldState.tasks
  yieldState.tasks = []
  for (let i = 0, len = tasks.length; i < len; i++) {
    tasks[i]()
  }
}

const setImmediate = "setImmediate" in globalThis ? globalThis.setImmediate : (f: () => void) => setTimeout(f, 0)

const yieldAdd = (task: () => void) => {
  yieldState.tasks.push(task)
  if (!yieldState.working) {
    yieldState.working = true
    setImmediate(() => {
      yieldState.working = false
      yieldFlush()
    })
  }
}

/**
 * @since 3.3.0
 * @category constructors
 */
export const yieldNow: Micro<void> = make(function(_env, onResult) {
  yieldAdd(() => onResult(Either.right(void 0)))
})

/**
 * @since 3.3.0
 * @category constructors
 */
export const never: Micro<never> = async<never>(function() {
  const interval = setInterval(constVoid, 2147483646)
  return sync(() => clearInterval(interval))
})

/**
 * @since 3.3.0
 * @category constructors
 */
export const gen = <Eff extends YieldWrap<Micro<any, any, any>>, AEff>(
  f: () => Generator<Eff, AEff, never>
): Micro<
  AEff,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer E, infer _R>>] ? E : never,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer _E, infer R>>] ? R : never
> =>
  make(function(env, onResult) {
    const iterator = f() as Iterator<YieldWrap<Micro<any, any, any>>, AEff, any>
    let running = false
    let value: any = undefined
    function run() {
      running = true
      try {
        let shouldContinue = true
        while (shouldContinue) {
          const result = iterator.next(value)
          if (result.done) {
            return onResult(Either.right(result.value))
          }
          shouldContinue = false
          yieldWrapGet(result.value)[runSymbol](env, function(result) {
            if (result._tag === "Left") {
              onResult(result)
            } else {
              shouldContinue = true
              value = result.right
              if (!running) run()
            }
          })
        }
      } catch (err) {
        onResult(Either.left(FailureUnexpected(err)))
      }
      running = false
    }
    run()
  })

// ----------------------------------------------------------------------------
// mapping & sequencing
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const flatten = <A, E, R, E2, R2>(self: Micro<Micro<A, E, R>, E2, R2>): Micro<A, E | E2, R | R2> =>
  make(function(env, onResult) {
    self[runSymbol](
      env,
      (result) => result._tag === "Left" ? onResult(result as any) : result.right[runSymbol](env, onResult)
    )
  })

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const map: {
  <A, B>(f: (a: NoInfer<A>) => B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, f: (a: NoInfer<A>) => B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, f: (a: A) => B): Micro<B, E, R> =>
  make(function(env, onResult) {
    self[runSymbol](env, function(result) {
      onResult(Either.map(result, f))
    })
  }))

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const as: {
  <A, B>(value: B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R> => map(self, (_) => value))

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const asSome = <A, E, R>(self: Micro<A, E, R>): Micro<Option.Some<A>, E, R> => map(self, Option.some) as any

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const flatMap: {
  <A, B, E2, R2>(f: (a: NoInfer<A>) => Micro<B, E2, R2>): <E, R>(self: Micro<A, E, R>) => Micro<B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<A>) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2> =>
    make(function(env, onResult) {
      self[runSymbol](env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        f(result.right)[runSymbol](env, onResult)
      })
    })
)

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const flip = <A, E, R>(self: Micro<A, E, R>): Micro<E, A, R> =>
  matchMicro(self, {
    onFailure: succeed,
    onSuccess: fail
  })

/**
 * @since 3.3.0
 * @category mapping & sequencing
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
      self[runSymbol](env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(result.right) : f
        if (isMicro(value)) {
          value[runSymbol](env, onResult)
        } else {
          onResult(ResultSucceed(value))
        }
      })
    })
)

/**
 * @since 3.3.0
 * @category mapping & sequencing
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
      self[runSymbol](env, function(selfResult) {
        if (selfResult._tag === "Left") {
          return onResult(selfResult as any)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(selfResult.right) : f
        if (isMicro(value)) {
          value[runSymbol](env, function(tapResult) {
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
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const asVoid = <A, E, R>(self: Micro<A, E, R>): Micro<void, E, R> => map(self, (_) => undefined)

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const asResult = <A, E, R>(self: Micro<A, E, R>): Micro<Result<A, E>, never, R> =>
  make(function(env, onResult) {
    self[runSymbol](env, function(result) {
      onResult(Either.right(result))
    })
  })

/**
 * @since 3.3.0
 * @category mapping & sequencing
 */
export const sandbox = <A, E, R>(self: Micro<A, E, R>): Micro<A, Failure<E>, R> =>
  catchAllFailure(self, (failure) => fail(failure))

function forkSignal(env: Env<any>) {
  const controller = new AbortController()
  const parentSignal = envGet(env, currentAbortSignal)
  function onAbort() {
    controller.abort()
    parentSignal.removeEventListener("abort", onAbort)
  }
  parentSignal.addEventListener("abort", onAbort)
  const envWithSignal = envMutate(env, function(refs) {
    refs[currentAbortController.key] = controller
    refs[currentAbortSignal.key] = controller.signal
    return refs
  })
  return [envWithSignal, onAbort] as const
}

/**
 * Returns an effect that races all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @since 3.3.0
 * @category sequencing
 */
export const raceAll = <Eff extends Micro<any, any, any>>(
  all: Iterable<Eff>
): Micro<Micro.Success<Eff>, Micro.Error<Eff>, Micro.Context<Eff>> =>
  make(function(env, onResult) {
    const [envWithSignal, onAbort] = forkSignal(env)

    const effects = Array.from(all)
    let len = effects.length
    let index = 0
    let done = 0
    let result: Result<any, any> | undefined = undefined
    const failures: Array<Failure<any>> = []
    function onDone(result_: Result<any, any>) {
      done++
      if (result_._tag === "Right" && result === undefined) {
        len = index
        result = result_
        onAbort()
      } else if (result_._tag === "Left") {
        failures.push(result_.left)
      }
      if (done >= len) {
        onResult(result ?? Either.left(failures[0]))
      }
    }

    for (; index < len; index++) {
      effects[index][runSymbol](envWithSignal, onDone)
    }
  })

/**
 * Returns an effect that races all the specified effects,
 * yielding the value of the first effect to succeed or fail. Losers of
 * the race will be interrupted immediately
 *
 * @since 3.3.0
 * @category sequencing
 */
export const raceAllFirst = <Eff extends Micro<any, any, any>>(
  all: Iterable<Eff>
): Micro<Micro.Success<Eff>, Micro.Error<Eff>, Micro.Context<Eff>> =>
  make(function(env, onResult) {
    const [envWithSignal, onAbort] = forkSignal(env)

    const effects = Array.from(all)
    let len = effects.length
    let index = 0
    let done = 0
    let result: Result<any, any> | undefined = undefined
    const failures: Array<Failure<any>> = []
    function onDone(result_: Result<any, any>) {
      done++
      if (result === undefined) {
        len = index
        result = result_
        onAbort()
      }
      if (done >= len) {
        onResult(result ?? Either.left(failures[0]))
      }
    }

    for (; index < len; index++) {
      effects[index][runSymbol](envWithSignal, onDone)
    }
  })

/**
 * Returns an effect that races two effects, yielding the value of the first
 * effect to succeed. Losers of the race will be interrupted immediately
 *
 * @since 3.3.0
 * @category sequencing
 */
export const race: {
  <A2, E2, R2>(that: Micro<A2, E2, R2>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2> =>
    raceAll([self, that])
)

/**
 * Returns an effect that races two effects, yielding the value of the first
 * effect to succeed *or* fail. Losers of the race will be interrupted immediately
 *
 * @since 3.3.0
 * @category sequencing
 */
export const raceFirst: {
  <A2, E2, R2>(that: Micro<A2, E2, R2>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2> =>
    raceAllFirst([self, that])
)

// ----------------------------------------------------------------------------
// zipping
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category zipping
 */
export const zip: {
  <A2, E2, R2>(
    that: Micro<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined }
      | undefined
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Micro<A, E, R>,
    that: Micro<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined }
      | undefined
  ): Micro<[A, A2], E | E2, R | R2>
} = dual((args) => isMicro(args[1]), <A, E, R, A2, E2, R2>(
  self: Micro<A, E, R>,
  that: Micro<A2, E2, R2>,
  options?:
    | { readonly concurrent?: boolean | undefined }
    | undefined
): Micro<[A, A2], E | E2, R | R2> => {
  if (options?.concurrent) {
    return all([self, that], { concurrency: "unbounded" })
  }
  return flatMap(self, (a) => map(that, (a2) => [a, a2]))
})

// ----------------------------------------------------------------------------
// filtering & conditionals
// ----------------------------------------------------------------------------

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the option to further
 * refine and narrow down the type of the success channel by providing a
 * [user-defined type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).
 * Let's explore this concept through an example:
 *
 * @since 3.3.0
 * @category filtering & conditionals
 */
export const filterOrFailWith: {
  <A, B extends A, E2>(
    refinement: Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => Failure<E2>
  ): <E, R>(self: Micro<A, E, R>) => Micro<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => Failure<E2>
  ): <E, R>(self: Micro<A, E, R>) => Micro<A, E2 | E, R>
  <A, E, R, B extends A, E2>(
    self: Micro<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => Failure<E2>
  ): Micro<B, E | E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, predicate: Predicate<A>, orFailWith: (a: A) => Failure<E2>): Micro<A, E | E2, R>
} = dual((args) => isMicro(args[0]), <A, E, R, B extends A, E2>(
  self: Micro<A, E, R>,
  refinement: Refinement<A, B>,
  orFailWith: (a: A) => Failure<E2>
): Micro<B, E | E2, R> => flatMap(self, (a) => refinement(a) ? succeed(a as any) : failWith(orFailWith(a))))

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the option to further
 * refine and narrow down the type of the success channel by providing a
 * [user-defined type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).
 * Let's explore this concept through an example:
 *
 * @since 3.3.0
 * @category filtering & conditionals
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    refinement: Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Micro<A, E, R>) => Micro<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Micro<A, E, R>) => Micro<A, E2 | E, R>
  <A, E, R, B extends A, E2>(
    self: Micro<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => E2
  ): Micro<B, E | E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, predicate: Predicate<A>, orFailWith: (a: A) => E2): Micro<A, E | E2, R>
} = dual((args) => isMicro(args[0]), <A, E, R, B extends A, E2>(
  self: Micro<A, E, R>,
  refinement: Refinement<A, B>,
  orFailWith: (a: A) => E2
): Micro<B, E | E2, R> => flatMap(self, (a) => refinement(a) ? succeed(a as any) : fail(orFailWith(a))))

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 3.3.0
 * @category filtering & conditionals
 */
export const when: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Micro<A, E, R>) => Micro<Option.Option<A>, E, R>
  <A, E, R>(self: Micro<A, E, R>, condition: LazyArg<boolean>): Micro<Option.Option<A>, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, condition: LazyArg<boolean>): Micro<Option.Option<A>, E, R> =>
    suspend(() => condition() ? asSome(self) : succeed(Option.none()))
)

/**
 * @since 3.3.0
 * @category filtering & conditionals
 */
export const whenMicro: {
  <E, R>(
    condition: Micro<boolean, E, R>
  ): <A, E2, R2>(effect: Micro<A, E2, R2>) => Micro<Option.Option<A>, E | E2, R | R2>
  <A, E2, R2, E, R>(self: Micro<A, E2, R2>, condition: Micro<boolean, E, R>): Micro<Option.Option<A>, E2 | E, R2 | R>
} = dual(
  2,
  <A, E2, R2, E, R>(self: Micro<A, E2, R2>, condition: Micro<boolean, E, R>): Micro<Option.Option<A>, E2 | E, R2 | R> =>
    flatMap(condition, (pass) => pass ? asSome(self) : succeed(Option.none()))
)

// ----------------------------------------------------------------------------
// repetition
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category repetition
 */
export const repeatResult: {
  <A, E>(options: {
    while: Predicate<Result<A, E>>
    times?: number | undefined
    delay?: DelayFn | undefined
  }): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, options: {
    while: Predicate<Result<A, E>>
    times?: number | undefined
    delay?: DelayFn | undefined
  }): Micro<A, E, R>
} = dual(2, <A, E, R>(self: Micro<A, E, R>, options: {
  while: Predicate<Result<A, E>>
  times?: number | undefined
  delay?: DelayFn | undefined
}): Micro<A, E, R> =>
  make(function(env, onResult) {
    const startedAt = options.delay ? Date.now() : 0
    let attempt = 0
    self[runSymbol](env, function loop(result) {
      if (options.while !== undefined && !options.while(result)) {
        return onResult(result)
      } else if (options.times !== undefined && attempt >= options.times) {
        return onResult(result)
      }
      attempt++
      let delayEffect = yieldNow
      if (options.delay !== undefined) {
        const elapsed = Duration.millis(Date.now() - startedAt)
        const duration = options.delay(attempt, elapsed)
        if (Option.isNone(duration)) {
          return onResult(result)
        }
        delayEffect = sleep(duration.value)
      }
      delayEffect[runSymbol](env, function(result) {
        if (result._tag === "Left") {
          return onResult(result as any)
        }
        self[runSymbol](env, loop)
      })
    })
  }))

/**
 * @since 3.3.0
 * @category repetition
 */
export const repeat: {
  <A, E>(options: {
    while?: Predicate<A> | undefined
    times?: number | undefined
    delay?: DelayFn | undefined
  }): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, options: {
    while?: Predicate<A> | undefined
    times?: number | undefined
    delay?: DelayFn | undefined
  }): Micro<A, E, R>
} = dual(2, <A, E, R>(self: Micro<A, E, R>, options: {
  while?: Predicate<A> | undefined
  times?: number | undefined
  delay?: DelayFn | undefined
}): Micro<A, E, R> =>
  repeatResult(self, {
    ...options,
    while: (result) => result._tag === "Right" && (options.while === undefined || options.while(result.right))
  }))

/**
 * @since 3.3.0
 * @category repetition
 */
export const forever = <A, E, R>(self: Micro<A, E, R>): Micro<never, E, R> => repeat(self, {}) as any

// ----------------------------------------------------------------------------
// delays
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category delays
 */
export type DelayFn = (attempt: number, elapsed: Duration.Duration) => Option.Option<Duration.DurationInput>

/**
 * @since 3.3.0
 * @category delays
 */
export const delayExponential = (base: Duration.DurationInput, factor = 2): DelayFn => {
  const baseMillis = Duration.toMillis(base)
  return (attempt) => Option.some(attempt ** factor * baseMillis)
}

/**
 * @since 3.3.0
 * @category delays
 */
export const delaySpaced = (duration: Duration.DurationInput): DelayFn => (_) => Option.some(duration)

/**
 * @since 3.3.0
 * @category delays
 */
export const delayWithMax: {
  (max: Duration.DurationInput): (self: DelayFn) => DelayFn
  (self: DelayFn, max: Duration.DurationInput): DelayFn
} = dual(
  2,
  (self: DelayFn, max: Duration.DurationInput): DelayFn => (attempt, elapsed) =>
    Option.map(self(attempt, elapsed), Duration.max(max))
)

/**
 * @since 3.3.0
 * @category delays
 */
export const delayWithMaxElapsed: {
  (max: Duration.DurationInput): (self: DelayFn) => DelayFn
  (self: DelayFn, max: Duration.DurationInput): DelayFn
} = dual(
  2,
  (self: DelayFn, max: Duration.DurationInput): DelayFn => (attempt, elapsed) =>
    Duration.lessThan(elapsed, max) ? self(attempt, elapsed) : Option.none()
)

// ----------------------------------------------------------------------------
// error handling
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category error handling
 */
export const catchAllFailure: {
  <E, B, E2, R2>(
    f: (a: NoInfer<Failure<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<Failure<E>>) => Micro<B, E2, R2>): Micro<A | B, E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<Failure<E>>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2> =>
    make(function(env, onResult) {
      self[runSymbol](env, function(result) {
        if (result._tag === "Right") {
          return onResult(result as any)
        }
        f(result.left)[runSymbol](env, onResult)
      })
    })
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const catchAll: {
  <E, B, E2, R2>(
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => Micro<B, E2, R2>): Micro<A | B, E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2> =>
    catchAllFailure(self, (failure) => failure._tag === "Expected" ? f(failure.error) : failWith(failure))
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const tapFailure: {
  <E, B, E2, R2>(
    f: (a: NoInfer<Failure<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<Failure<E>>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    catchAllFailure(self, (failure) => andThen(f(failure as any), failWith(failure)))
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const tapError: {
  <E, B, E2, R2>(
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    tapFailure(self, (failure) => failure._tag === "Expected" ? f(failure.error) : failWith(failure))
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const catchIf: {
  <E, EB extends E, B, E2, R2>(
    pred: Refinement<E, EB>,
    f: (a: NoInfer<EB>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <E, B, E2, R2>(
    pred: Predicate<NoInfer<E>>,
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <A, E, R, EB extends E, B, E2, R2>(
    self: Micro<A, E, R>,
    pred: Refinement<E, EB>,
    f: (a: NoInfer<EB>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    pred: Predicate<NoInfer<E>>,
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2>
} = dual(
  3,
  <A, E, R, EB extends E, B, E2, R2>(
    self: Micro<A, E, R>,
    pred: Refinement<E, EB>,
    f: (a: NoInfer<EB>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2> => catchAll(self, (error) => pred(error) ? f(error) : fail(error) as any)
)

/**
 * Recovers from the specified tagged error.
 *
 * @since 3.3.0
 * @category error handling
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
    self: Micro<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
  ): Micro<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = dual(3, <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
  self: Micro<A, E, R>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
): Micro<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1> => catchIf(self, (error) => isTagged(error, k), f as any))

/**
 * @since 3.3.0
 * @category error handling
 */
export const mapFailure: {
  <E, E2>(f: (a: NoInfer<Failure<E>>) => Failure<E2>): <A, R>(self: Micro<A, E, R>) => Micro<A, E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, f: (a: NoInfer<Failure<E>>) => Failure<E2>): Micro<A, E2, R>
} = dual(
  2,
  <A, E, R, E2>(self: Micro<A, E, R>, f: (a: NoInfer<Failure<E>>) => Failure<E2>): Micro<A, E2, R> =>
    catchAllFailure(self, (failure) => failWith(f(failure)))
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const mapError: {
  <E, E2>(f: (a: NoInfer<E>) => E2): <A, R>(self: Micro<A, E, R>) => Micro<A, E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => E2): Micro<A, E2, R>
} = dual(
  2,
  <A, E, R, E2>(self: Micro<A, E, R>, f: (a: NoInfer<E>) => E2): Micro<A, E2, R> =>
    catchAll(self, (error) => fail(f(error)))
)

/**
 * @since 3.3.0
 * @category error handling
 */
export const orDie = <A, E, R>(self: Micro<A, E, R>): Micro<A, never, R> => catchAll(self, die)

/**
 * @since 3.3.0
 * @category error handling
 */
export const orElseSucceed: {
  <B>(f: LazyArg<B>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | B, never, R>
  <A, E, R, B>(self: Micro<A, E, R>, f: LazyArg<B>): Micro<A | B, never, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, f: LazyArg<B>): Micro<A | B, never, R> => catchAll(self, (_) => sync(f)))

/**
 * @since 3.3.0
 * @category error handling
 */
export const ignore = <A, E, R>(self: Micro<A, E, R>): Micro<void, never, R> =>
  matchMicro(self, { onFailure: die, onSuccess: () => void_ })

/**
 * @since 3.3.0
 * @category error handling
 */
export const option = <A, E, R>(self: Micro<A, E, R>): Micro<Option.Option<A>, never, R> =>
  match(self, { onFailure: () => Option.none(), onSuccess: Option.some })

/**
 * @since 3.3.0
 * @category error handling
 */
export const either = <A, E, R>(self: Micro<A, E, R>): Micro<Either.Either<A, E>, never, R> =>
  match(self, { onFailure: Either.left, onSuccess: Either.right })

/**
 * @since 3.3.0
 * @category error handling
 */
export const retry: {
  <A, E>(options: {
    while?: Predicate<E> | undefined
    times?: number | undefined
    delay?: DelayFn | undefined
  }): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, options: {
    while?: Predicate<E> | undefined
    times?: number | undefined
    delay?: DelayFn | undefined
  }): Micro<A, E, R>
} = dual(2, <A, E, R>(self: Micro<A, E, R>, options: {
  while?: Predicate<E> | undefined
  times?: number | undefined
  delay?: DelayFn | undefined
}): Micro<A, E, R> =>
  repeatResult(self, {
    ...options,
    while: (result) =>
      result._tag === "Left" && result.left._tag === "Expected" &&
      (options.while === undefined || options.while(result.left.error))
  }))

// ----------------------------------------------------------------------------
// pattern matching
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category pattern matching
 */
export const matchFailureMicro: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (failure: Failure<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (failure: Failure<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R>
} = dual(
  2,
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (failure: Failure<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R> =>
    make(function(env, onResult) {
      self[runSymbol](env, function(result) {
        try {
          const next = result._tag === "Left" ? options.onFailure(result.left) : options.onSuccess(result.right)
          next[runSymbol](env, onResult)
        } catch (err) {
          onResult(Either.left(FailureUnexpected(err)))
        }
      })
    })
)

/**
 * @since 3.3.0
 * @category pattern matching
 */
export const matchMicro: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R>
} = dual(
  2,
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R> =>
    matchFailureMicro(self, {
      onFailure: (failure) => failure._tag === "Expected" ? options.onFailure(failure.error) : failWith(failure),
      onSuccess: options.onSuccess
    })
)

/**
 * @since 3.3.0
 * @category pattern matching
 */
export const match: {
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Micro<A2 | A3, never, R>
} = dual(
  2,
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Micro<A2 | A3, never, R> =>
    matchMicro(self, {
      onFailure: (error) => sync(() => options.onFailure(error)),
      onSuccess: (value) => sync(() => options.onSuccess(value))
    })
)

// ----------------------------------------------------------------------------
// delays & timeouts
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category delays & timeouts
 */
export const sleep = (duration: Duration.DurationInput): Micro<void> => {
  const millis = Duration.toMillis(duration)
  return async(function(resume) {
    const timeout = setTimeout(function() {
      resume(void_)
    }, millis)
    return sync(() => {
      return clearTimeout(timeout)
    })
  })
}

/**
 * @since 3.3.0
 * @category delays & timeouts
 */
export const delay: {
  (duration: Duration.DurationInput): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<A, E, R> => andThen(sleep(duration), self)
)

/**
 * Returns an effect that will timeout this effect, that will succeed with the
 * fallback effect if the timeout elapses before the effect has produced a value.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @since 3.3.0
 * @category delays & timeouts
 */
export const timeoutOrElse: {
  <A2, E2, R2>(options: {
    readonly duration: Duration.DurationInput
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, options: {
    readonly duration: Duration.DurationInput
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, options: {
    readonly duration: Duration.DurationInput
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): Micro<A | A2, E | E2, R | R2> =>
    raceFirst(self, andThen(interruptible(sleep(options.duration)), options.onTimeout))
)

/**
 * Returns an effect that will timeout this effect, succeeding with a `None`
 * if the timeout elapses before the effect has produced a value; and `Some` of
 * the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @since 3.3.0
 * @category delays & timeouts
 */
export const timeout: {
  (duration: Duration.DurationInput): <A, E, R>(self: Micro<A, E, R>) => Micro<Option.Option<A>, E, R>
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<Option.Option<A>, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, duration: Duration.DurationInput): Micro<Option.Option<A>, E, R> =>
    raceFirst(
      asSome(self),
      as(interruptible(sleep(duration)), Option.none())
    )
)

// ----------------------------------------------------------------------------
// resources & finalization
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const MicroScopeTypeId: unique symbol = Symbol.for("effect/Micro/MicroScope")

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export type MicroScopeTypeId = typeof MicroScopeTypeId

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export interface MicroScope {
  readonly [MicroScopeTypeId]: MicroScopeTypeId
  readonly addFinalizer: (finalizer: (result: Result<unknown, unknown>) => Micro<void>) => Micro<void>
  readonly fork: Micro<MicroScope.Closeable>
}

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export declare namespace MicroScope {
  /**
   * @since 3.3.0
   * @category resources & finalization
   */
  export interface Closeable extends MicroScope {
    readonly close: (result: Result<any, any>) => Micro<void>
  }
}

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const MicroScope: Context.Tag<MicroScope, MicroScope> = Context.GenericTag<MicroScope>("effect/Micro/MicroScope")

class ScopeImpl implements MicroScope.Closeable {
  readonly [MicroScopeTypeId]: MicroScopeTypeId
  state: {
    readonly _tag: "Open"
    readonly finalizers: Set<(result: Result<any, any>) => Micro<void>>
  } | {
    readonly _tag: "Closed"
    readonly result: Result<any, any>
  } = { _tag: "Open", finalizers: new Set() }

  constructor() {
    this[MicroScopeTypeId] = MicroScopeTypeId
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
 * @since 3.3.0
 * @category resources & finalization
 */
export const makeScope = (): Micro<MicroScope.Closeable> => sync(() => new ScopeImpl())

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const scope: Micro<MicroScope, never, MicroScope> = service(MicroScope)

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const scoped = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, Exclude<R, MicroScope>> =>
  suspend(function() {
    const scope = new ScopeImpl()
    return onResult(provideService(self, MicroScope, scope), (result) => scope.close(result))
  })

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const acquireRelease = <A, E, R>(
  acquire: Micro<A, E, R>,
  release: (a: A, result: Result<unknown, unknown>) => Micro<void>
): Micro<A, E, R | MicroScope> =>
  uninterruptible(flatMap(
    scope,
    (scope) => tap(acquire, (a) => scope.addFinalizer((result) => release(a, result)))
  ))

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const addFinalizer = (
  finalizer: (result: Result<unknown, unknown>) => Micro<void>
): Micro<void, never, MicroScope> => flatMap(scope, (scope) => scope.addFinalizer(finalizer))

/**
 * @since 3.3.0
 * @category resources & finalization
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
      make(function(env, onResult) {
        restore(self)[runSymbol](env, function(result) {
          f(result)[runSymbol](env, function(finalizerResult) {
            if (finalizerResult._tag === "Left") {
              return onResult(finalizerResult as any)
            }
            onResult(result)
          })
        })
      })
    )
)

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const ensuring: {
  <XE, XR>(
    finalizer: Micro<void, XE, XR>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR> =>
    onResult(self, (_) => finalizer)
)

/**
 * @since 3.3.0
 * @category resources & finalization
 */
export const onInterrupt: {
  <A, E, XE, XR>(
    f: (result: Result<A, E>) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, f: (result: Result<A, E>) => Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Micro<A, E, R>, f: (result: Result<A, E>) => Micro<void, XE, XR>): Micro<A, E | XE, R | XR> =>
    onResult(self, (result) => (result._tag === "Left" && result.left._tag === "Aborted" ? f(result) : void_))
)

/**
 * @since 3.3.0
 * @category resources & finalization
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
          (result) => andThen(release(a, result), fromResult(result))
        )
    )
  )

// ----------------------------------------------------------------------------
// environment
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category environment
 */
export const getEnvRef = <A>(fiberRef: EnvRef<A>): Micro<A> =>
  make((env, onResult) => onResult(Either.right(envGet(env, fiberRef))))

/**
 * @since 3.3.0
 * @category environment
 */
export const locally: {
  <A>(fiberRef: EnvRef<A>, value: A): <XA, E, R>(self: Micro<XA, E, R>) => Micro<XA, E, R>
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R>
} = dual(
  3,
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R> =>
    make((env, onResult) => self[runSymbol](envSet(env, fiberRef, value), onResult))
)

/**
 * @since 3.3.0
 * @category environment
 */
export const context = <R>(): Micro<Context.Context<R>> => getEnvRef(currentContext) as any

/**
 * @since 3.3.0
 * @category environment
 */
export const provideContext: {
  <XR>(context: Context.Context<XR>): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, Exclude<R, XR>>
  <A, E, R, XR>(self: Micro<A, E, R>, context: Context.Context<XR>): Micro<A, E, Exclude<R, XR>>
} = dual(
  2,
  <A, E, R, XR>(self: Micro<A, E, R>, provided: Context.Context<XR>): Micro<A, E, Exclude<R, XR>> =>
    make(function(env, onResult) {
      const context = envGet(env, currentContext)
      const nextEnv = envSet(env, currentContext, Context.merge(context, provided))
      self[runSymbol](nextEnv, onResult)
    })
)

/**
 * @since 3.3.0
 * @category environment
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
      self[runSymbol](nextEnv, onResult)
    })
)

/**
 * @since 3.3.0
 * @category environment
 */
export const provideServiceMicro: {
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

// ----------------------------------------------------------------------------
// interruption
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category interruption
 */
export const uninterruptible = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, R> =>
  unsafeMakeNoAbort(function(env, onResult) {
    const nextEnv = envMutate(env, function(env) {
      env[currentInterruptible.key] = false
      env[currentAbortSignal.key] = new AbortController().signal
      return env
    })
    self[runSymbol](nextEnv, onResult)
  })

/**
 * @since 3.3.0
 * @category interruption
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
    effect[runSymbol](nextEnv, onResult)
  })

/**
 * @since 3.3.0
 * @category interruption
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
    self[runSymbol](newEnv, onResult)
  })

// ========================================================================
// collecting & elements
// ========================================================================

/**
 * @since 3.3.0
 */
export declare namespace All {
  /**
   * @since 3.3.0
   */
  export type MicroAny = Micro<any, any, any>

  /**
   * @since 3.3.0
   */
  export type ReturnIterable<T extends Iterable<MicroAny>, Discard extends boolean> = [T] extends
    [Iterable<Micro<infer A, infer E, infer R>>] ? Micro<
      Discard extends true ? void : Array<A>,
      E,
      R
    >
    : never

  /**
   * @since 3.3.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean> = Micro<
    Discard extends true ? void
      : T[number] extends never ? []
      : { -readonly [K in keyof T]: T[K] extends Micro<infer _A, infer _E, infer _R> ? _A : never },
    T[number] extends never ? never
      : T[number] extends Micro<infer _A, infer _E, infer _R> ? _E
      : never,
    T[number] extends never ? never
      : T[number] extends Micro<infer _A, infer _E, infer _R> ? _R
      : never
  > extends infer X ? X : never

  /**
   * @since 3.3.0
   */
  export type ReturnObject<T, Discard extends boolean> = [T] extends [{ [K: string]: MicroAny }] ? Micro<
      Discard extends true ? void :
        { -readonly [K in keyof T]: [T[K]] extends [Micro<infer _A, infer _E, infer _R>] ? _A : never },
      keyof T extends never ? never
        : T[keyof T] extends Micro<infer _A, infer _E, infer _R> ? _E
        : never,
      keyof T extends never ? never
        : T[keyof T] extends Micro<infer _A, infer _E, infer _R> ? _R
        : never
    >
    : never

  /**
   * @since 3.3.0
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true

  /**
   * @since 3.3.0
   */
  export type Return<
    Arg extends Iterable<MicroAny> | Record<string, MicroAny>,
    O extends {
      readonly concurrency?: Concurrency | undefined
      readonly discard?: boolean | undefined
    }
  > = [Arg] extends [ReadonlyArray<MicroAny>] ? ReturnTuple<Arg, IsDiscard<O>>
    : [Arg] extends [Iterable<MicroAny>] ? ReturnIterable<Arg, IsDiscard<O>>
    : [Arg] extends [Record<string, MicroAny>] ? ReturnObject<Arg, IsDiscard<O>>
    : never
}

/**
 * Runs all the provided effects in sequence respecting the structure provided in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record / struct.
 *
 * @since 3.3.0
 * @category collecting & elements
 */
export const all = <
  const Arg extends Iterable<Micro<any, any, any>> | Record<string, Micro<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: boolean | undefined
  }
>(arg: Arg, options?: O): All.Return<Arg, O> => {
  if (Array.isArray(arg) || isIterable(arg)) {
    return (forEach as any)(arg, identity, options)
  } else if (options?.discard) {
    return (forEach as any)(Object.values(arg), identity, options)
  }
  return suspend(() => {
    const out: Record<string, unknown> = {}
    return as(
      forEach(Object.entries(arg), ([key, effect]) =>
        map(effect, (value) => {
          out[key] = value
        }), {
        discard: true,
        concurrency: options?.concurrency
      }),
      out
    )
  }) as any
}

/**
 * @since 3.3.0
 * @category collecting & elements
 */
export const forEach: {
  <A, B, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>, index: number) => Micro<B, E, R>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: false | undefined
  }): Micro<Array<B>, E, R>
  <A, B, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>, index: number) => Micro<B, E, R>, options: {
    readonly concurrency?: Concurrency | undefined
    readonly discard: true
  }): Micro<void, E, R>
} = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: NoInfer<A>, index: number) => Micro<B, E, R>, options?: {
  readonly concurrency?: Concurrency | undefined
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  make(function(env, onResult) {
    const concurrency = options?.concurrency === "inherit"
      ? envGet(env, currentConcurrency)
      : options?.concurrency ?? 1
    if (concurrency === "unbounded" || concurrency > 1) {
      forEachConcurrent(iterable, f, {
        discard: options?.discard,
        concurrency
      })[runSymbol](
        env,
        onResult
      )
    } else {
      forEachSequential(iterable, f, options)[runSymbol](env, onResult)
    }
  })

const forEachSequential = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: NoInfer<A>, index: number) => Micro<B, E, R>, options?: {
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
          f(items[current], current)[runSymbol](env, function(result) {
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
>(iterable: Iterable<A>, f: (a: NoInfer<A>, index: number) => Micro<B, E, R>, options: {
  readonly concurrency: number | "unbounded"
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  unsafeMake(function(env, onResult) {
    // abort
    const [envWithSignal, onAbort] = forkSignal(env)
    function onDone() {
      length = index
      onAbort()
    }

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
          f(item, currentIndex)[runSymbol](envWithSignal, function(result) {
            if (result._tag === "Left") {
              if (failure === undefined) {
                failure = result
                onDone()
              }
            } else if (out !== undefined) {
              out[currentIndex] = result.right
            }
            doneCount++
            inProgress--
            if (doneCount === length) {
              onAbort()
              onResult(failure ?? Either.right(out))
            } else if (!pumping && inProgress < concurrency) {
              pump()
            }
          })
        } catch (err) {
          failure = Either.left(FailureUnexpected(err))
          onDone()
        }
      }
      pumping = false
    }
    pump()
  })

/**
 * @since 3.3.0
 * @category collecting & elements
 */
export const filter = <A, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<boolean, E, R>, options?: {
  readonly concurrency?: Concurrency | undefined
  readonly negate?: boolean | undefined
}): Micro<Array<A>, E, R> =>
  suspend(() => {
    const out: Array<A> = []
    return as(
      forEach(iterable, (a) =>
        map(f(a), (passed) => {
          if (options?.negate === true) {
            passed = !passed
          }
          if (passed) {
            out.push(a)
          }
        }), {
        discard: true,
        concurrency: options?.concurrency
      }),
      out
    )
  })

// ----------------------------------------------------------------------------
// handle & forking
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category handle & forking
 */
export const HandleTypeId: unique symbol = Symbol.for("effect/Micro/Handle")

/**
 * @since 3.3.0
 * @category handle & forking
 */
export type HandleTypeId = typeof HandleTypeId

/**
 * @since 3.3.0
 * @category handle & forking
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
 * @since 3.3.0
 * @category handle & forking
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
    yieldAdd(() => {
      self[runSymbol](nextEnv, (result) => {
        handle.emit(result)
      })
    })
    onResult(Either.right(handle))
  })

/**
 * @since 3.3.0
 * @category handle & forking
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
    yieldAdd(() => {
      self[runSymbol](nextEnv, (result) => {
        handle.emit(result)
      })
    })
    onResult(Either.right(handle))
  })

// ----------------------------------------------------------------------------
// execution
// ----------------------------------------------------------------------------

/**
 * @since 3.3.0
 * @category execution
 */
export const runFork = <A, E>(effect: Micro<A, E>): Handle<A, E> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  const env = envMake(refs)
  const handle = new HandleImpl<A, E>(controller.signal, controller)
  effect[runSymbol](envSet(env, currentAbortSignal, handle._controller.signal), (result) => {
    handle.emit(result)
  })
  return handle
}

/**
 * @since 3.3.0
 * @category execution
 */
export const runPromiseResult = <A, E>(effect: Micro<A, E>): Promise<Result<A, E>> =>
  new Promise((resolve, _reject) => {
    const handle = runFork(effect)
    handle.addObserver(resolve)
  })

/**
 * @since 3.3.0
 * @category execution
 */
export const runPromise = <A, E>(effect: Micro<A, E>): Promise<A> =>
  runPromiseResult(effect).then((result) => {
    if (result._tag === "Left") {
      throw result.left
    }
    return result.right
  })

/**
 * @since 3.3.0
 * @category execution
 */
export const runSyncResult = <A, E>(effect: Micro<A, E>): Result<A, E> => {
  const handle = runFork(effect)
  while (yieldState.tasks.length > 0) {
    yieldFlush()
  }
  const result = handle.unsafePoll()
  if (result === null) {
    return Either.left(FailureUnexpected(handle))
  }
  return result
}

/**
 * @since 3.3.0
 * @category execution
 */
export const runSync = <A, E>(effect: Micro<A, E>): A => {
  const result = runSyncResult(effect)
  if (result._tag === "Left") {
    throw result.left
  }
  return result.right
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

interface YieldableError extends Pipeable, Inspectable, Readonly<Error> {
  readonly [EffectTypeId]: Effect.VarianceStruct<never, this, never>
  readonly [Stream.StreamTypeId]: Effect.VarianceStruct<never, this, never>
  readonly [Sink.SinkTypeId]: Sink.Sink.VarianceStruct<never, unknown, never, this, never>
  readonly [Channel.ChannelTypeId]: Channel.Channel.VarianceStruct<never, unknown, this, unknown, never, unknown, never>
  readonly [TypeId]: Micro.Variance<never, this, never>
  readonly [runSymbol]: (env: Env<any>, onResult: (result: Result<never, this>) => void) => void
  [Symbol.iterator](): MicroIterator<Micro<never, this, never>>
}

const YieldableError: new(message?: string) => YieldableError = (function() {
  class YieldableError extends globalThis.Error {
    [runSymbol](_env: any, onResult: any) {
      onResult(ResultFail(this))
    }
    toString() {
      return this.message ? `${this.name}: ${this.message}` : this.name
    }
    toJSON() {
      return { ...this }
    }
    [NodeInspectSymbol](): string {
      const stack = this.stack
      if (stack) {
        return `${this.toString()}\n${stack.split("\n").slice(1).join("\n")}`
      }
      return this.toString()
    }
  }
  Object.assign(YieldableError.prototype, MicroProto, StructuralPrototype)
  return YieldableError as any
})()

/**
 * @since 3.3.0
 * @category errors
 */
export const Error: new<A extends Record<string, any> = {}>(
  args: Equals<A, {}> extends true ? void
    : { readonly [P in keyof A]: A[P] }
) => YieldableError & Readonly<A> = (function() {
  return class extends YieldableError {
    constructor(args: any) {
      super()
      if (args) {
        Object.assign(this, args)
      }
    }
  } as any
})()

/**
 * @since 3.3.0
 * @category errors
 */
export const TaggedError = <Tag extends string>(tag: Tag): new<A extends Record<string, any> = {}>(
  args: Equals<A, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }
) => YieldableError & { readonly _tag: Tag } & Readonly<A> => {
  class Base extends Error<{}> {
    readonly _tag = tag
  }
  ;(Base.prototype as any).name = tag
  return Base as any
}
