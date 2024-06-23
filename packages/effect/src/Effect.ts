/**
 * @since 2.0.0
 */
import type * as RA from "./Array.js"
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Clock from "./Clock.js"
import type { ConfigProvider } from "./ConfigProvider.js"
import type { Console } from "./Console.js"
import type * as Context from "./Context.js"
import type * as Deferred from "./Deferred.js"
import type * as Duration from "./Duration.js"
import type * as Either from "./Either.js"
import type { Equivalence } from "./Equivalence.js"
import type { ExecutionStrategy } from "./ExecutionStrategy.js"
import type * as Exit from "./Exit.js"
import type * as Fiber from "./Fiber.js"
import type * as FiberId from "./FiberId.js"
import type * as FiberRef from "./FiberRef.js"
import type * as FiberRefs from "./FiberRefs.js"
import type * as FiberRefsPatch from "./FiberRefsPatch.js"
import type * as FiberStatus from "./FiberStatus.js"
import type { LazyArg } from "./Function.js"
import { dual } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import type * as HashSet from "./HashSet.js"
import type { TypeLambda } from "./HKT.js"
import * as _console from "./internal/console.js"
import { TagProto } from "./internal/context.js"
import * as effect from "./internal/core-effect.js"
import * as core from "./internal/core.js"
import * as defaultServices from "./internal/defaultServices.js"
import * as circular from "./internal/effect/circular.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as layer from "./internal/layer.js"
import * as query from "./internal/query.js"
import * as _runtime from "./internal/runtime.js"
import * as _schedule from "./internal/schedule.js"
import type * as Layer from "./Layer.js"
import type { LogLevel } from "./LogLevel.js"
import type * as Metric from "./Metric.js"
import type * as MetricLabel from "./MetricLabel.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type * as Random from "./Random.js"
import type * as Ref from "./Ref.js"
import * as Request from "./Request.js"
import type { RequestBlock } from "./RequestBlock.js"
import type { RequestResolver } from "./RequestResolver.js"
import type * as Runtime from "./Runtime.js"
import type * as RuntimeFlags from "./RuntimeFlags.js"
import type * as RuntimeFlagsPatch from "./RuntimeFlagsPatch.js"
import type * as Schedule from "./Schedule.js"
import * as Scheduler from "./Scheduler.js"
import type * as Scope from "./Scope.js"
import type * as Supervisor from "./Supervisor.js"
import type * as Tracer from "./Tracer.js"
import type { Concurrency, Covariant, NoInfer, NotFunction } from "./Types.js"
import type * as Unify from "./Unify.js"
import type { YieldWrap } from "./Utils.js"

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category symbols
 */
export const EffectTypeId: unique symbol = core.EffectTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type EffectTypeId = typeof EffectTypeId

/**
 * The `Effect` interface defines a value that lazily describes a workflow or job.
 * The workflow requires some context `R`, and may fail with an error of type `E`,
 * or succeed with a value of type `A`.
 *
 * `Effect` values model resourceful interaction with the outside world, including
 * synchronous, asynchronous, concurrent, and parallel interaction. They use a
 * fiber-based concurrency model, with built-in support for scheduling, fine-grained
 * interruption, structured concurrency, and high scalability.
 *
 * To run an `Effect` value, you need a `Runtime`, which is a type that is capable
 * of executing `Effect` values.
 *
 * @since 2.0.0
 * @category models
 */
export interface Effect<out A, out E = never, out R = never> extends Effect.Variance<A, E, R>, Pipeable {
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: EffectUnify<this>
  readonly [Unify.ignoreSymbol]?: EffectUnifyIgnore
  [Symbol.iterator](): EffectGenerator<Effect<A, E, R>>
}

/**
 * @since 3.0.0
 * @category models
 */
export interface EffectGenerator<T extends Effect<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<YieldWrap<T>, Effect.Success<T>>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface EffectUnify<A extends { [Unify.typeSymbol]?: any }>
  extends Either.EitherUnify<A>, Option.OptionUnify<A>, Context.TagUnify<A>
{
  Effect?: () => A[Unify.typeSymbol] extends Effect<infer A0, infer E0, infer R0> | infer _ ? Effect<A0, E0, R0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface EffectUnifyIgnore {
  Tag?: true
  Option?: true
  Either?: true
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface EffectTypeLambda extends TypeLambda {
  readonly type: Effect<this["Target"], this["Out1"], this["Out2"]>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Blocked<out A, out E> extends Effect<A, E> {
  readonly _op: "Blocked"
  readonly effect_instruction_i0: RequestBlock
  readonly effect_instruction_i1: Effect<A, E>
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Context.js" {
  interface Tag<Id, Value> extends Effect<Value, never, Id> {
    [Symbol.iterator](): EffectGenerator<Tag<Id, Value>>
  }
  interface TagUnifyIgnore {
    Effect?: true
    Either?: true
    Option?: true
  }
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Either.js" {
  interface Left<L, R> extends Effect<R, L> {
    readonly _tag: "Left"
    [Symbol.iterator](): EffectGenerator<Left<L, R>>
  }
  interface Right<L, R> extends Effect<R, L> {
    readonly _tag: "Right"
    [Symbol.iterator](): EffectGenerator<Right<L, R>>
  }
  interface EitherUnifyIgnore {
    Effect?: true
    Tag?: true
    Option?: true
  }
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Option.js" {
  interface None<A> extends Effect<A, Cause.NoSuchElementException> {
    readonly _tag: "None"
    [Symbol.iterator](): EffectGenerator<None<A>>
  }
  interface Some<A> extends Effect<A, Cause.NoSuchElementException> {
    readonly _tag: "Some"
    [Symbol.iterator](): EffectGenerator<Some<A>>
  }
  interface OptionUnifyIgnore {
    Effect?: true
    Tag?: true
    Either?: true
  }
}

/**
 * @since 2.0.0
 */
export declare namespace Effect {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out A, out E, out R> {
    readonly [EffectTypeId]: VarianceStruct<A, E, R>
  }
  /**
   * @since 2.0.0
   * @category models
   */
  export interface VarianceStruct<out A, out E, out R> {
    readonly _V: string
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
    readonly _R: Covariant<R>
  }
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Context<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _R : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _E : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _A : never
}

// -------------------------------------------------------------------------------------
// refinements
// -------------------------------------------------------------------------------------

/**
 * This function returns `true` if the specified value is an `Effect` value,
 * `false` otherwise.
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Effect` value. For example, you could
 * use `isEffect` to check the type of a value before using it as an
 * argument to a function that expects an `Effect` value.
 *
 * @param u - The value to check for being an `Effect` value.
 *
 * @returns `true` if the specified value is an `Effect` value, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isEffect: (u: unknown) => u is Effect<unknown, unknown, unknown> = core.isEffect

// -------------------------------------------------------------------------------------
// caching
// -------------------------------------------------------------------------------------

/**
 * Returns an effect that caches its result for a specified duration, known as
 * the `timeToLive`. When the cache expires after the duration, the effect will be
 * recomputed upon next evaluation.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * let i = 1
 * const expensiveTask = Effect.promise<string>(() => {
 *   console.log("expensive task...")
 *   return new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve(`result ${i++}`)
 *     }, 100)
 *   })
 * })
 *
 * const program = Effect.gen(function* () {
 *   const cached = yield* Effect.cachedWithTTL(expensiveTask, "150 millis")
 *   yield* cached.pipe(Effect.andThen(Console.log))
 *   yield* cached.pipe(Effect.andThen(Console.log))
 *   yield* Effect.sleep("100 millis")
 *   yield* cached.pipe(Effect.andThen(Console.log))
 * })
 *
 * Effect.runFork(program)
 * // Output:
 * // expensive task...
 * // result 1
 * // result 1
 * // expensive task...
 * // result 2
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedWithTTL: {
  (timeToLive: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<A, E>, never, R>
  <A, E, R>(self: Effect<A, E, R>, timeToLive: Duration.DurationInput): Effect<Effect<A, E>, never, R>
} = circular.cached

/**
 * Similar to {@link cachedWithTTL}, this function caches an effect's result for a
 * specified duration. It also includes an additional effect for manually
 * invalidating the cached value before it naturally expires.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * let i = 1
 * const expensiveTask = Effect.promise<string>(() => {
 *   console.log("expensive task...")
 *   return new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve(`result ${i++}`)
 *     }, 100)
 *   })
 * })
 *
 * const program = Effect.gen(function* () {
 *   const [cached, invalidate] = yield* Effect.cachedInvalidateWithTTL(
 *     expensiveTask,
 *     "1 hour"
 *   )
 *   yield* cached.pipe(Effect.andThen(Console.log))
 *   yield* cached.pipe(Effect.andThen(Console.log))
 *   yield* invalidate
 *   yield* cached.pipe(Effect.andThen(Console.log))
 * })
 *
 * Effect.runFork(program)
 * // Output:
 * // expensive task...
 * // result 1
 * // result 1
 * // expensive task...
 * // result 2
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedInvalidateWithTTL: {
  (timeToLive: Duration.DurationInput): <A, E, R>(
    self: Effect<A, E, R>
  ) => Effect<[Effect<A, E>, Effect<void>], never, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    timeToLive: Duration.DurationInput
  ): Effect<[Effect<A, E>, Effect<void>], never, R>
} = circular.cachedInvalidateWithTTL

/**
 * Returns an effect that computes a result lazily and caches it. Subsequent
 * evaluations of this effect will return the cached result without re-executing
 * the logic.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * let i = 1
 * const expensiveTask = Effect.promise<string>(() => {
 *   console.log("expensive task...")
 *   return new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve(`result ${i++}`)
 *     }, 100)
 *   })
 * })
 *
 * const program = Effect.gen(function* () {
 *   console.log("non-cached version:")
 *   yield* expensiveTask.pipe(Effect.andThen(Console.log))
 *   yield* expensiveTask.pipe(Effect.andThen(Console.log))
 *   console.log("cached version:")
 *   const cached = yield* Effect.cached(expensiveTask)
 *   yield* cached.pipe(Effect.andThen(Console.log))
 *   yield* cached.pipe(Effect.andThen(Console.log))
 * })
 *
 * Effect.runFork(program)
 * // Output:
 * // non-cached version:
 * // expensive task...
 * // result 1
 * // expensive task...
 * // result 2
 * // cached version:
 * // expensive task...
 * // result 3
 * // result 3
 *
 * @since 2.0.0
 * @category caching
 */
export const cached: <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<A, E, R>> = effect.memoize

/**
 * Returns a memoized version of a function with effects. Memoization ensures
 * that results are stored and reused for the same inputs, reducing the need to
 * recompute them.
 *
 * @example
 * import { Effect, Random } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const randomNumber = (n: number) => Random.nextIntBetween(1, n)
 *   console.log("non-memoized version:")
 *   console.log(yield* randomNumber(10))
 *   console.log(yield* randomNumber(10))
 *
 *   console.log("memoized version:")
 *   const memoized = yield* Effect.cachedFunction(randomNumber)
 *   console.log(yield* memoized(10))
 *   console.log(yield* memoized(10))
 * })
 *
 * Effect.runFork(program)
 * // Example Output:
 * // non-memoized version:
 * // 2
 * // 8
 * // memoized version:
 * // 5
 * // 5
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedFunction: <A, B, E, R>(
  f: (a: A) => Effect<B, E, R>,
  eq?: Equivalence<A>
) => Effect<(a: A) => Effect<B, E, R>> = circular.cachedFunction

/**
 * Returns an effect that executes only once, regardless of how many times it's
 * called.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const task1 = Console.log("task1")
 *   yield* Effect.repeatN(task1, 2)
 *   const task2 = yield* Effect.once(Console.log("task2"))
 *   yield* Effect.repeatN(task2, 2)
 * })
 *
 * Effect.runFork(program)
 * // Output:
 * // task1
 * // task1
 * // task1
 * // task2
 *
 * @since 2.0.0
 * @category caching
 */
export const once: <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<void, E, R>> = effect.once

// -------------------------------------------------------------------------------------
// collecting & elements
// -------------------------------------------------------------------------------------

/**
 * Runs all the provided effects in sequence respecting the structure provided in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record / struct.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const all: <
  const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
>(arg: Arg, options?: O) => All.Return<Arg, O> = fiberRuntime.all

/**
 * Data-last variant of `Effect.all`.
 *
 * Runs all the provided effects in sequence respecting the structure provided in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record / struct.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const allWith: <
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
  }
>(
  options?: O
) => <const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>>(
  arg: Arg
) => All.Return<Arg, O> = fiberRuntime.allWith

/**
 * @since 2.0.0
 */
export declare namespace All {
  /**
   * @since 2.0.0
   */
  export type EffectAny = Effect<any, any, any>

  /**
   * @since 2.0.0
   */
  export type ReturnIterable<T extends Iterable<EffectAny>, Discard extends boolean, Mode> = [T] extends
    [Iterable<Effect.Variance<infer R0, infer L0, infer R>>] ? Effect<
      Discard extends true ? void : Mode extends "either" ? Array<Either.Either<R0, L0>> : Array<R0>,
      Mode extends "either" ? never
        : Mode extends "validate" ? Array<Option.Option<L0>>
        : L0,
      R
    >
    : never

  /**
   * @since 2.0.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean, Mode> = Effect<
    Discard extends true ? void
      : T[number] extends never ? []
      : Mode extends "either" ? {
          -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ?
            Either.Either<_A, _E>
            : never
        }
      : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ? _A : never },
    Mode extends "either" ? never
      : T[number] extends never ? never
      : Mode extends "validate" ? {
          -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ? Option.Option<_E>
            : never
        }
      : [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    T[number] extends never ? never
      : [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R
      : never
  > extends infer X ? X : never

  /**
   * @since 2.0.0
   */
  export type ReturnObject<T, Discard extends boolean, Mode> = [T] extends [{ [K: string]: EffectAny }] ? Effect<
      Discard extends true ? void
        : Mode extends "either" ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ?
              Either.Either<_A, _E>
              : never
          }
        : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ? _A : never },
      Mode extends "either" ? never
        : keyof T extends never ? never
        : Mode extends "validate" ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _A, infer _E, infer _R>] ? Option.Option<_E>
              : never
          }
        : [T[keyof T]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E
        : never,
      keyof T extends never ? never
        : [T[keyof T]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R
        : never
    >
    : never

  /**
   * @since 2.0.0
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true

  /**
   * @since 2.0.0
   */
  export type ExtractMode<A> = [A] extends [{ mode: infer M }] ? M : "default"

  /**
   * @since 2.0.0
   */
  export type Return<
    Arg extends Iterable<EffectAny> | Record<string, EffectAny>,
    O extends {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: boolean | undefined
      readonly mode?: "default" | "validate" | "either" | undefined
    }
  > = [Arg] extends [ReadonlyArray<EffectAny>] ? ReturnTuple<Arg, IsDiscard<O>, ExtractMode<O>>
    : [Arg] extends [Iterable<EffectAny>] ? ReturnIterable<Arg, IsDiscard<O>, ExtractMode<O>>
    : [Arg] extends [Record<string, EffectAny>] ? ReturnObject<Arg, IsDiscard<O>, ExtractMode<O>>
    : never
}

/**
 * Evaluate and run each effect in the structure and collect the results,
 * discarding results from failed effects.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const allSuccesses: <X extends Effect<any, any, any>>(
  elements: Iterable<X>,
  options?:
    | {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
    | undefined
) => Effect<Array<Effect.Success<X>>, never, Effect.Context<X>> = fiberRuntime.allSuccesses

/**
 * Drops all elements until the effectful predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const dropUntil: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<boolean, E, R>): Effect<Array<A>, E, R>
} = effect.dropUntil

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const dropWhile: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<boolean, E, R>): Effect<Array<A>, E, R>
} = effect.dropWhile

/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const every: {
  <A, E, R>(f: (a: A, i: number) => Effect<boolean, E, R>): (elements: Iterable<A>) => Effect<boolean, E, R>
  <A, E, R>(elements: Iterable<A>, f: (a: A, i: number) => Effect<boolean, E, R>): Effect<boolean, E, R>
} = effect.every

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const exists: {
  <A, E, R>(
    f: (a: A, i: number) => Effect<boolean, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
      }
      | undefined
  ): (elements: Iterable<A>) => Effect<boolean, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<boolean, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
      }
      | undefined
  ): Effect<boolean, E, R>
} = fiberRuntime.exists

/**
 * Filters the collection using the specified effectful predicate.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const filter: {
  <A, E, R>(
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
    } | undefined
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
    } | undefined
  ): Effect<Array<A>, E, R>
} = fiberRuntime.filter

/**
 * Performs a filter and map in a single step.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const filterMap: {
  <Eff extends Effect<any, any, any>, B>(
    pf: (a: Effect.Success<Eff>) => Option.Option<B>
  ): (elements: Iterable<Eff>) => Effect<Array<B>, Effect.Error<Eff>, Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>, B>(
    elements: Iterable<Eff>,
    pf: (a: Effect.Success<Eff>) => Option.Option<B>
  ): Effect<Array<B>, Effect.Error<Eff>, Effect.Context<Eff>>
} = effect.filterMap

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const findFirst: {
  <A, E, R>(
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): Effect<Option.Option<A>, E, R>
} = effect.findFirst

/**
 * This function takes an iterable of `Effect` values and returns a new
 * `Effect` value that represents the first `Effect` value in the iterable
 * that succeeds. If all of the `Effect` values in the iterable fail, then
 * the resulting `Effect` value will fail as well.
 *
 * This function is sequential, meaning that the `Effect` values in the
 * iterable will be executed in sequence, and the first one that succeeds
 * will determine the outcome of the resulting `Effect` value.
 *
 * @param effects - The iterable of `Effect` values to evaluate.
 *
 * @returns A new `Effect` value that represents the first successful
 * `Effect` value in the iterable, or a failed `Effect` value if all of the
 * `Effect` values in the iterable fail.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const firstSuccessOf: <Eff extends Effect<any, any, any>>(
  effects: Iterable<Eff>
) => Effect<Effect.Success<Eff>, Effect.Error<Eff>, Effect.Context<Eff>> = effect.firstSuccessOf
/**
 * @since 2.0.0
 * @category collecting & elements
 */
export const forEach: {
  <B, E, R, S extends Iterable<any>>(
    f: (a: RA.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    } | undefined
  ): (
    self: S
  ) => Effect<RA.ReadonlyArray.With<S, B>, E, R>
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): (self: Iterable<A>) => Effect<void, E, R>
  <B, E, R, S extends Iterable<any>>(
    self: S,
    f: (a: RA.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    } | undefined
  ): Effect<RA.ReadonlyArray.With<S, B>, E, R>
  <A, B, E, R>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<void, E, R>
} = fiberRuntime.forEach as any

/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const head: <A, E, R>(self: Effect<Iterable<A>, E, R>) => Effect<A, Cause.NoSuchElementException | E, R> =
  effect.head

/**
 * Merges an `Iterable<Effect<A, E, R>>` to a single effect, working
 * sequentially.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const mergeAll: {
  <Z, Eff extends Effect<any, any, any>>(
    zero: Z,
    f: (z: Z, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): (elements: Iterable<Eff>) => Effect<Z, Effect.Error<Eff>, Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>, Z>(
    elements: Iterable<Eff>,
    zero: Z,
    f: (z: Z, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<Z, Effect.Error<Eff>, Effect.Context<Eff>>
} = fiberRuntime.mergeAll

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const partition: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): (elements: Iterable<A>) => Effect<[excluded: Array<E>, satisfying: Array<B>], never, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<[excluded: Array<E>, satisfying: Array<B>], never, R>
} = fiberRuntime.partition

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduce: {
  <Z, A, E, R>(zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, E, R>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): Effect<Z, E, R>
} = effect.reduce

/**
 * Reduces an `Iterable<Effect<A, E, R>>` to a single effect.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceEffect: {
  <Z, E, R, Eff extends Effect<any, any, any>>(
    zero: Effect<Z, E, R>,
    f: (acc: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): (elements: Iterable<Eff>) => Effect<Z, E | Effect.Error<Eff>, R | Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>, Z, E, R>(
    elements: Iterable<Eff>,
    zero: Effect<Z, E, R>,
    f: (acc: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<Z, E | Effect.Error<Eff>, R | Effect.Context<Eff>>
} = fiberRuntime.reduceEffect

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceRight: {
  <A, Z, R, E>(zero: Z, f: (a: A, z: Z, i: number) => Effect<Z, E, R>): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z, i: number) => Effect<Z, E, R>): Effect<Z, E, R>
} = effect.reduceRight

/**
 * Folds over the elements in this chunk from the left, stopping the fold early
 * when the predicate is not satisfied.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceWhile: {
  <Z, A, E, R>(
    zero: Z,
    options: { readonly while: Predicate<Z>; readonly body: (s: Z, a: A, i: number) => Effect<Z, E, R> }
  ): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, E, R>(
    elements: Iterable<A>,
    zero: Z,
    options: { readonly while: Predicate<Z>; readonly body: (s: Z, a: A, i: number) => Effect<Z, E, R> }
  ): Effect<Z, E, R>
} = effect.reduceWhile

/**
 * Replicates the given effect `n` times.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const replicate: {
  (n: number): <A, E, R>(self: Effect<A, E, R>) => Array<Effect<A, E, R>>
  <A, E, R>(self: Effect<A, E, R>, n: number): Array<Effect<A, E, R>>
} = fiberRuntime.replicate

/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const replicateEffect: {
  (
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<Array<A>, E, R>
  (
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<void, E, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect<Array<A>, E, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<void, E, R>
} = fiberRuntime.replicateEffect

/**
 * Takes elements until the effectual predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const takeUntil: {
  <A, R, E>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): Effect<Array<A>, E, R>
} = effect.takeUntil

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const takeWhile: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): Effect<Array<A>, E, R>
} = effect.takeWhile

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const validateAll: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    } | undefined
  ): (elements: Iterable<A>) => Effect<Array<B>, Array<E>, R>
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): (elements: Iterable<A>) => Effect<void, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    } | undefined
  ): Effect<Array<B>, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<void, Array<E>, R>
} = fiberRuntime.validateAll

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * If `elements` is empty then `Effect.fail([])` is returned.
 *
 * @example
 * import { Effect, Exit } from "effect"
 *
 * const f = (n: number) => (n > 0 ? Effect.succeed(n) : Effect.fail(`${n} is negative`))
 *
 * assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([], f)), Exit.fail([]))
 * assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([1, 2], f)), Exit.succeed(1))
 * assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([1, -1], f)), Exit.succeed(1))
 * assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([-1, 2], f)), Exit.succeed(2))
 * assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([-1, -2], f)), Exit.fail(['-1 is negative', '-2 is negative']))
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const validateFirst: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): (elements: Iterable<A>) => Effect<B, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | { readonly concurrency?: Concurrency | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<B, Array<E>, R>
} = fiberRuntime.validateFirst

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. The callback
 * function `Effect<A, E, R> => void` **MUST** be called at most once.
 *
 * The registration function can optionally return an Effect, which will be
 * executed if the `Fiber` executing this Effect is interrupted.
 *
 * The registration function can also receive an `AbortSignal` if required for
 * interruption.
 *
 * The `FiberId` of the fiber that may complete the async callback may also be
 * specified. This is called the "blocking fiber" because it suspends the fiber
 * executing the `async` Effect (i.e. semantically blocks the fiber from making
 * progress). Specifying this fiber id in cases where it is known will improve
 * diagnostics, but not affect the behavior of the returned effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const async: <A, E = never, R = never>(
  register: (callback: (_: Effect<A, E, R>) => void, signal: AbortSignal) => void | Effect<void, never, R>,
  blockingOn?: FiberId.FiberId
) => Effect<A, E, R> = core.async

/**
 * Converts an asynchronous, callback-style API into an `Effect`, which will
 * be executed asynchronously.
 *
 * With this variant, the registration function may return a an `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncEffect: <A, E, R, R3, E2, R2>(
  register: (callback: (_: Effect<A, E, R>) => void) => Effect<Effect<void, never, R3> | void, E2, R2>
) => Effect<A, E | E2, R | R2 | R3> = _runtime.asyncEffect

/**
 * Low level constructor that enables for custom stack tracing cutpoints.
 *
 * It is meant to be called with a bag of instructions that become available in the "this" of the effect.
 *
 * @example
 * import { Effect } from "effect"
 *
 * const throwingFunction = () => { throw new Error() }
 * const blowUp = Effect.custom(throwingFunction, function() {
 *   return Effect.succeed(this.effect_instruction_i0())
 * })
 *
 * @since 2.0.0
 * @category constructors
 */
export const custom: {
  <X, A, E, R>(i0: X, body: (this: { effect_instruction_i0: X }) => Effect<A, E, R>): Effect<A, E, R>
  <X, Y, A, E, R>(
    i0: X,
    i1: Y,
    body: (this: { effect_instruction_i0: X; effect_instruction_i1: Y }) => Effect<A, E, R>
  ): Effect<A, E, R>
  <X, Y, Z, A, E, R>(
    i0: X,
    i1: Y,
    i2: Z,
    body: (this: { effect_instruction_i0: X; effect_instruction_i1: Y; effect_instruction_i2: Z }) => Effect<A, E, R>
  ): Effect<A, E, R>
} = core.custom

/**
 * @since 2.0.0
 * @category constructors
 */
export const withFiberRuntime: <A, E = never, R = never>(
  withRuntime: (
    fiber: Fiber.RuntimeFiber<A, E>,
    status: FiberStatus.Running
  ) => Effect<A, E, R>
) => Effect<A, E, R> = core.withFiberRuntime

/**
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Effect<never, E> = core.fail

/**
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Effect<never, E> = core.failSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E> = core.failCause

/**
 * @since 2.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Effect<never, E> = core.failCauseSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Effect<never> = core.die

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Effect<never> = core.dieMessage

/**
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Effect<never> = core.dieSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const gen: {
  <Eff extends YieldWrap<Effect<any, any, any>>, AEff>(
    f: (resume: Adapter) => Generator<Eff, AEff, never>
  ): Effect<
    AEff,
    [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
    [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
  >
  <Self, Eff extends YieldWrap<Effect<any, any, any>>, AEff>(
    self: Self,
    f: (this: Self, resume: Adapter) => Generator<Eff, AEff, never>
  ): Effect<
    AEff,
    [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
    [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
  >
} = effect.gen

/**
 * @since 2.0.0
 * @category models
 */
export interface Adapter {
  <A, E, R>(self: Effect<A, E, R>): Effect<A, E, R>
  <A, _A, _E, _R>(a: A, ab: (a: A) => Effect<_A, _E, _R>): Effect<_A, _E, _R>
  <A, B, _A, _E, _R>(a: A, ab: (a: A) => B, bc: (b: B) => Effect<_A, _E, _R>): Effect<_A, _E, _R>
  <A, B, C, _A, _E, _R>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => Effect<_A, _E, _R>): Effect<_A, _E, _R>
  <A, B, C, D, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _A, _E, _R>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => T,
    tu: (s: T) => Effect<_A, _E, _R>
  ): Effect<_A, _E, _R>
}

/**
 * Returns an effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: Effect<never> = core.never

/**
 * Requires the option produced by this value to be `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const none: <A, E, R>(
  self: Effect<Option.Option<A>, E, R>
) => Effect<void, E | Cause.NoSuchElementException, R> = effect.none

/**
 * Like `tryPromise` but produces a defect in case of errors.
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped Promise api.
 *
 * @since 2.0.0
 * @category constructors
 */
export const promise: <A>(
  evaluate: (signal: AbortSignal) => PromiseLike<A>
) => Effect<A> = effect.promise

/**
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Effect<A> = core.succeed

/**
 * Returns an effect which succeeds with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedNone: Effect<Option.Option<never>> = effect.succeedNone

/**
 * Returns an effect which succeeds with the value wrapped in a `Some`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => Effect<Option.Option<A>> = effect.succeedSome

/**
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <A, E, R>(effect: LazyArg<Effect<A, E, R>>) => Effect<A, E, R> = core.suspend

/**
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Effect<A> = core.sync

const _void: Effect<void> = core.void
export {
  /**
   * @since 2.0.0
   * @category constructors
   */
  _void as void
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const yieldNow: (options?: {
  readonly priority?: number | undefined
}) => Effect<void> = core.yieldNow

// -------------------------------------------------------------------------------------
// error handling
// -------------------------------------------------------------------------------------

const _catch: {
  <N extends keyof E, K extends E[N] & string, E, A1, E1, R1>(
    discriminator: N,
    options: { readonly failure: K; readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect<A1, E1, R1> }
  ): <A, R>(self: Effect<A, E, R>) => Effect<A1 | A, E1 | Exclude<E, { [n in N]: K }>, R1 | R>
  <A, E, R, N extends keyof E, K extends E[N] & string, A1, E1, R1>(
    self: Effect<A, E, R>,
    discriminator: N,
    options: { readonly failure: K; readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect<A1, E1, R1> }
  ): Effect<A | A1, E1 | Exclude<E, { [n in N]: K }>, R | R1>
} = effect._catch

export {
  /**
   * Recovers from specified error.
   *
   * @since 2.0.0
   * @category error handling
   */
  _catch as catch
}

/**
 * Recovers from all recoverable errors.
 *
 * **Note**: that `Effect.catchAll` will not recover from unrecoverable defects. To
 * recover from both recoverable and unrecoverable errors use
 * `Effect.catchAllCause`.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAll: {
  <E, A2, E2, R2>(f: (e: E) => Effect<A2, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, f: (e: E) => Effect<A2, E2, R2>): Effect<A2 | A, E2, R2 | R>
} = core.catchAll

/**
 * Recovers from both recoverable and unrecoverable errors.
 *
 * See `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAllCause: {
  <E, A2, E2, R2>(
    f: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    f: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>
  ): Effect<A | A2, E2, R | R2>
} = core.catchAllCause

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAllDefect: {
  <A2, E2, R2>(
    f: (defect: unknown) => Effect<A2, E2, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    f: (defect: unknown) => Effect<A2, E2, R2>
  ): Effect<A | A2, E | E2, R | R2>
} = effect.catchAllDefect

/**
 * Recovers from errors that match the given predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchIf: {
  <E, EB extends E, A2, E2, R2>(
    refinement: Refinement<NoInfer<E>, EB>,
    f: (e: EB) => Effect<A2, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | Exclude<E, EB>, R2 | R>
  <E, A2, E2, R2>(
    predicate: Predicate<NoInfer<E>>,
    f: (e: NoInfer<E>) => Effect<A2, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E | E2, R2 | R>
  <A, E, R, EB extends E, A2, E2, R2>(
    self: Effect<A, E, R>,
    refinement: Refinement<E, EB>,
    f: (e: EB) => Effect<A2, E2, R2>
  ): Effect<A | A2, E2 | Exclude<E, EB>, R | R2>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    predicate: Predicate<E>,
    f: (e: E) => Effect<A2, E2, R2>
  ): Effect<A | A2, E | E2, R | R2>
} = core.catchIf

/**
 * Recovers from some or all of the error cases.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, A2, E2, R2>(
    pf: (e: NoInfer<E>) => Option.Option<Effect<A2, E2, R2>>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E | E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    pf: (e: NoInfer<E>) => Option.Option<Effect<A2, E2, R2>>
  ): Effect<A | A2, E | E2, R | R2>
} = core.catchSome

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSomeCause: {
  <E, A2, E2, R2>(
    f: (cause: Cause.Cause<NoInfer<E>>) => Option.Option<Effect<A2, E2, R2>>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E | E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    f: (cause: Cause.Cause<NoInfer<E>>) => Option.Option<Effect<A2, E2, R2>>
  ): Effect<A2 | A, E | E2, R2 | R>
} = effect.catchSomeCause

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSomeDefect: {
  <A2, E2, R2>(
    pf: (defect: unknown) => Option.Option<Effect<A2, E2, R2>>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    pf: (defect: unknown) => Option.Option<Effect<A2, E2, R2>>
  ): Effect<A | A2, E | E2, R | R2>
} = effect.catchSomeDefect

/**
 * Recovers from the specified tagged error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
    self: Effect<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): Effect<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = effect.catchTag

/**
 * Recovers from the specified tagged errors.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTags: {
  <
    E,
    Cases extends
      & { [K in Extract<E, { _tag: string }>["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>) }
      & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string }>["_tag"]>]: never })
  >(
    cases: Cases
  ): <A, R>(
    self: Effect<A, E, R>
  ) => Effect<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer A, any, any> ? A : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer R> ? R : never
    }[keyof Cases]
  >
  <
    R,
    E,
    A,
    Cases extends
      & { [K in Extract<E, { _tag: string }>["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>) }
      & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string }>["_tag"]>]: never })
  >(
    self: Effect<A, E, R>,
    cases: Cases
  ): Effect<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer A, any, any> ? A : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer R> ? R : never
    }[keyof Cases]
  >
} = effect.catchTags

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @since 2.0.0
 * @category error handling
 */
export const cause: <A, E, R>(self: Effect<A, E, R>) => Effect<Cause.Cause<E>, never, R> = effect.cause

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @since 2.0.0
 * @category error handling
 */
export const eventually: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = effect.eventually

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const ignore: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignore

/**
 * Returns a new effect that ignores the success or failure of this effect,
 * but which also logs failures at the Debug level, just in case the failure
 * turns out to be important.
 *
 * @since 2.0.0
 * @category error handling
 */
export const ignoreLogged: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignoreLogged

/**
 * Exposes all parallel errors in a single call.
 *
 * @since 2.0.0
 * @category error handling
 */
export const parallelErrors: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Array<E>, R> = effect.parallelErrors

/**
 * Exposes the full `Cause` of failure for the specified effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const sandbox: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Cause.Cause<E>, R> = effect.sandbox

/**
 * @since 2.0.0
 * @category error handling
 */
export declare namespace Retry {
  /**
   * @since 2.0.0
   * @category error handling
   */
  export type Return<R, E, A, O extends Options<E>> = Effect<
    A,
    | (O extends { schedule: Schedule.Schedule<infer _O, infer _I, infer _R> } ? E
      : O extends { until: Refinement<E, infer E2> } ? E2
      : E)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer E, infer _R> } ? E : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer E, infer _R> } ? E : never),
    | R
    | (O extends { schedule: Schedule.Schedule<infer _O, infer _I, infer R> } ? R : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer _E, infer R> } ? R : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer _E, infer R> } ? R : never)
  > extends infer Z ? Z : never

  /**
   * @since 2.0.0
   * @category error handling
   */
  export interface Options<E> {
    while?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined
    until?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined
    times?: number | undefined
    schedule?: Schedule.Schedule<any, E, any> | undefined
  }
}

/**
 * Retries according to the options provided
 *
 * @since 2.0.0
 * @category error handling
 */
export const retry: {
  <E, O extends Retry.Options<E>>(
    options: O
  ): <A, R>(
    self: Effect<A, E, R>
  ) => Retry.Return<R, E, A, O>
  <B, E, R1>(
    policy: Schedule.Schedule<B, NoInfer<E>, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E, R1 | R>
  <A, E, R, O extends Retry.Options<E>>(
    self: Effect<A, E, R>,
    options: O
  ): Retry.Return<R, E, A, O>
  <A, E, R, B, R1>(
    self: Effect<A, E, R>,
    policy: Schedule.Schedule<B, E, R1>
  ): Effect<A, E, R1 | R>
} = _schedule.retry_combined

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryOrElse: {
  <A1, E, R1, A2, E2, R2>(
    policy: Schedule.Schedule<A1, NoInfer<E>, R1>,
    orElse: (e: NoInfer<E>, out: A1) => Effect<A2, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R1 | R2 | R>
  <A, E, R, A1, R1, A2, E2, R2>(
    self: Effect<A, E, R>,
    policy: Schedule.Schedule<A1, NoInfer<E>, R1>,
    orElse: (e: NoInfer<E>, out: A1) => Effect<A2, E2, R2>
  ): Effect<A | A2, E2, R | R1 | R2>
} = _schedule.retryOrElse_Effect

const try_: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Effect<A, E>
  <A>(evaluate: LazyArg<A>): Effect<A, Cause.UnknownException>
} = effect.try_

export {
  /**
   * Imports a synchronous side-effect into a pure `Effect` value, translating any
   * thrown exceptions into typed failed effects creating with `Effect.fail`.
   *
   * @since 2.0.0
   * @category error handling
   */
  try_ as try
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `try` function, translating any promise rejections into typed failed effects
 * via the `catch` function.
 *
 * @since 2.0.0
 * @category error handling
 */
export const tryMap: {
  <A, B, E1>(
    options: { readonly try: (a: A) => B; readonly catch: (error: unknown) => E1 }
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E1 | E, R>
  <A, E, R, B, E1>(self: Effect<A, E, R>, options: {
    readonly try: (a: A) => B
    readonly catch: (error: unknown) => E1
  }): Effect<B, E | E1, R>
} = effect.tryMap

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `try` function, translating any promise rejections into typed failed effects
 * via the `catch` function.
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped Promise api.
 *
 * @since 2.0.0
 * @category error handling
 */
export const tryMapPromise: {
  <A, B, E1>(
    options: { readonly try: (a: A, signal: AbortSignal) => PromiseLike<B>; readonly catch: (error: unknown) => E1 }
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E1 | E, R>
  <A, E, R, B, E1>(
    self: Effect<A, E, R>,
    options: { readonly try: (a: A, signal: AbortSignal) => PromiseLike<B>; readonly catch: (error: unknown) => E1 }
  ): Effect<B, E | E1, R>
} = effect.tryMapPromise

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped Promise api.
 *
 * @since 2.0.0
 * @category error handling
 */
export const tryPromise: {
  <A, E>(
    options: { readonly try: (signal: AbortSignal) => PromiseLike<A>; readonly catch: (error: unknown) => E }
  ): Effect<A, E>
  <A>(try_: (signal: AbortSignal) => PromiseLike<A>): Effect<A, Cause.UnknownException>
} = effect.tryPromise

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect<A, E, R>`
 *
 * @since 2.0.0
 * @category error handling
 */
export const unsandbox: <A, E, R>(self: Effect<A, Cause.Cause<E>, R>) => Effect<A, E, R> = effect.unsandbox

// -------------------------------------------------------------------------------------
// interuption
// -------------------------------------------------------------------------------------

/**
 * This function checks if any fibers are attempting to interrupt the current
 * fiber, and if so, performs self-interruption.
 *
 * Note that this allows for interruption to occur in uninterruptible regions.
 *
 * @returns A new `Effect` value that represents the check for interruption
 * and the potential self-interruption of the current fiber.
 *
 * @since 2.0.0
 * @category interruption
 */
export const allowInterrupt: Effect<void> = effect.allowInterrupt

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @since 2.0.0
 * @category interruption
 */
export const checkInterruptible: <A, E, R>(f: (isInterruptible: boolean) => Effect<A, E, R>) => Effect<A, E, R> =
  core.checkInterruptible

/**
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 *
 * @since 2.0.0
 * @category interruption
 */
export const disconnect: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.disconnect

/**
 * @since 2.0.0
 * @category interruption
 */
export const interrupt: Effect<never> = core.interrupt

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptWith: (fiberId: FiberId.FiberId) => Effect<never> = core.interruptWith

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.interruptible

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptibleMask: <A, E, R>(
  f: (restore: <AX, EX, RX>(effect: Effect<AX, EX, RX>) => Effect<AX, EX, RX>) => Effect<A, E, R>
) => Effect<A, E, R> = core.interruptibleMask

/**
 * @since 2.0.0
 * @category interruption
 */
export const onInterrupt: {
  <X, R2>(
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<X, never, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Effect<A, E, R>,
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<X, never, R2>
  ): Effect<A, E, R | R2>
} = core.onInterrupt

/**
 * @since 2.0.0
 * @category interruption
 */
export const uninterruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.uninterruptible

/**
 * @since 2.0.0
 * @category interruption
 */
export const uninterruptibleMask: <A, E, R>(
  f: (restore: <AX, EX, RX>(effect: Effect<AX, EX, RX>) => Effect<AX, EX, RX>) => Effect<A, E, R>
) => Effect<A, E, R> = core.uninterruptibleMask

// -------------------------------------------------------------------------------------
// lifting
// -------------------------------------------------------------------------------------

/**
 * Transforms a `Predicate` function into an `Effect` returning the input value if the predicate returns `true`
 * or failing with specified error if the predicate fails
 *
 * @param predicate - A `Predicate` function that takes in a value of type `A` and returns a boolean.
 *
 * @example
 * import { Effect } from "effect"
 *
 * const isPositive = (n: number): boolean => n > 0
 *
 * // succeeds with `1`
 * Effect.liftPredicate(1, isPositive, n => `${n} is not positive`)
 *
 * // fails with `"0 is not positive"`
 * Effect.liftPredicate(0, isPositive, n => `${n} is not positive`)
 *
 * @category lifting
 * @since 3.4.0
 */
export const liftPredicate: {
  <A, B extends A, E>(
    refinement: Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => E
  ): (a: A) => Effect<B, E>
  <A, E>(predicate: Predicate<NoInfer<A>>, orFailWith: (a: NoInfer<A>) => E): (a: A) => Effect<A, E>
  <A, E, B extends A>(self: A, refinement: Refinement<A, B>, orFailWith: (a: A) => E): Effect<B, E>
  <A, E>(self: A, predicate: Predicate<NoInfer<A>>, orFailWith: (a: NoInfer<A>) => E): Effect<A, E>
} = effect.liftPredicate

// -------------------------------------------------------------------------------------
// mapping
// -------------------------------------------------------------------------------------

/**
 * This function maps the success value of an `Effect` value to a specified
 * constant value.
 *
 * @param value - The constant value that the success value of the `Effect`
 * value will be mapped to.
 * @param self - The `Effect` value whose success value will be mapped to the
 * specified constant value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to the specified constant value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <B>(value: B): <A, E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
  <A, E, R, B>(self: Effect<A, E, R>, value: B): Effect<B, E, R>
} = core.as

/**
 * This function maps the success value of an `Effect` value to a `Some` value
 * in an `Option` value. If the original `Effect` value fails, the returned
 * `Effect` value will also fail.
 *
 * @param self - The `Effect` value whose success value will be mapped to a
 * `Some` value in an `Option` value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to a `Some` value in an `Option`
 * value. The returned `Effect` value may fail if the original `Effect` value
 * fails.
 *
 * @category mapping
 * @since 2.0.0
 */
export const asSome: <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R> = effect.asSome

/**
 * This function maps the error value of an `Effect` value to a `Some` value
 * in an `Option` value. If the original `Effect` value succeeds, the returned
 * `Effect` value will also succeed.
 *
 * @param self - The `Effect` value whose error value will be mapped to a
 * `Some` value in an `Option` value.
 *
 * @returns A new `Effect` value that represents the mapping of the error
 * value of the original `Effect` value to a `Some` value in an `Option`
 * value. The returned `Effect` value may succeed if the original `Effect`
 * value succeeds.
 *
 * @category mapping
 * @since 2.0.0
 */
export const asSomeError: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Option.Option<E>, R> = effect.asSomeError

/**
 * This function maps the success value of an `Effect` value to `void`. If the
 * original `Effect` value succeeds, the returned `Effect` value will also
 * succeed. If the original `Effect` value fails, the returned `Effect` value
 * will fail with the same error.
 *
 * @param self - The `Effect` value whose success value will be mapped to `void`.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to `void`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asVoid: <A, E, R>(self: Effect<A, E, R>) => Effect<void, E, R> = core.asVoid

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @since 2.0.0
 * @category mapping
 */
export const flip: <A, E, R>(self: Effect<A, E, R>) => Effect<E, A, R> = core.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @since 2.0.0
 * @category mapping
 */
export const flipWith: {
  <E, A, R, E2, A2, R2>(
    f: (effect: Effect<E, A, R>) => Effect<E2, A2, R2>
  ): (self: Effect<A, E, R>) => Effect<A2, E2, R2>
  <A, E, R, E2, A2, R2>(
    self: Effect<A, E, R>,
    f: (effect: Effect<E, A, R>) => Effect<E2, A2, R2>
  ): Effect<A2, E2, R2>
} = effect.flipWith

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
  <A, E, R, B>(self: Effect<A, E, R>, f: (a: A) => B): Effect<B, E, R>
} = core.map

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccum: {
  <S, A, B, E, R>(
    zero: S,
    f: (s: S, a: A, i: number) => Effect<readonly [S, B], E, R>
  ): (elements: Iterable<A>) => Effect<[S, Array<B>], E, R>
  <A, S, B, E, R>(
    elements: Iterable<A>,
    zero: S,
    f: (s: S, a: A, i: number) => Effect<readonly [S, B], E, R>
  ): Effect<[S, Array<B>], E, R>
} = effect.mapAccum

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified `onFailure` and `onSuccess` functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <E, E2, A, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): <R>(self: Effect<A, E, R>) => Effect<A2, E2, R>
  <A, E, R, E2, A2>(
    self: Effect<A, E, R>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Effect<A2, E2, R>
} = core.mapBoth

/**
 * Returns an effect with its error channel mapped using the specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (e: E) => E2): Effect<A, E2, R>
} = core.mapError

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<A, E2, R>
} = effect.mapErrorCause

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @since 2.0.0
 * @category mapping
 */
export const merge: <A, E, R>(self: Effect<A, E, R>) => Effect<E | A, never, R> = effect.merge

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @since 2.0.0
 * @category mapping
 */
export const negate: <E, R>(self: Effect<boolean, E, R>) => Effect<boolean, E, R> = effect.negate

// -------------------------------------------------------------------------------------
// scoping, resources & finalization
// -------------------------------------------------------------------------------------

/**
 * This function constructs a scoped resource from an `acquire` and `release`
 * `Effect` value.
 *
 * If the `acquire` `Effect` value successfully completes execution, then the
 * `release` `Effect` value will be added to the finalizers associated with the
 * scope of this `Effect` value, and it is guaranteed to be run when the scope
 * is closed.
 *
 * The `acquire` and `release` `Effect` values will be run uninterruptibly.
 * Additionally, the `release` `Effect` value may depend on the `Exit` value
 * specified when the scope is closed.
 *
 * @param acquire - The `Effect` value that acquires the resource.
 * @param release - The `Effect` value that releases the resource.
 *
 * @returns A new `Effect` value that represents the scoped resource.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const acquireRelease: {
  <A, X, R2>(
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R2>
  ): <E, R>(acquire: Effect<A, E, R>) => Effect<A, E, Scope.Scope | R2 | R>
  <A, E, R, X, R2>(
    acquire: Effect<A, E, R>,
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R2>
  ): Effect<A, E, Scope.Scope | R | R2>
} = fiberRuntime.acquireRelease

/**
 * This function constructs a scoped resource from an `acquire` and `release`
 * `Effect` value.
 *
 * If the `acquire` `Effect` value successfully completes execution, then the
 * `release` `Effect` value will be added to the finalizers associated with the
 * scope of this `Effect` value, and it is guaranteed to be run when the scope
 * is closed.
 *
 * The `acquire` `Effect` values will be run interruptibly.
 * The `release` `Effect` values will be run uninterruptibly.
 *
 * Additionally, the `release` `Effect` value may depend on the `Exit` value
 * specified when the scope is closed.
 *
 * @param acquire - The `Effect` value that acquires the resource.
 * @param release - The `Effect` value that releases the resource.
 *
 * @returns A new `Effect` value that represents the scoped resource.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const acquireReleaseInterruptible: {
  <X, R2>(
    release: (exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R2>
  ): <A, E, R>(acquire: Effect<A, E, R>) => Effect<A, E, Scope.Scope | R2 | R>
  <A, E, R, X, R2>(
    acquire: Effect<A, E, R>,
    release: (exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R2>
  ): Effect<A, E, Scope.Scope | R | R2>
} = fiberRuntime.acquireReleaseInterruptible

/**
 * This function is used to ensure that an `Effect` value that represents the
 * acquisition of a resource (for example, opening a file, launching a thread,
 * etc.) will not be interrupted, and that the resource will always be released
 * when the `Effect` value completes execution.
 *
 * `acquireUseRelease` does the following:
 *
 *   1. Ensures that the `Effect` value that acquires the resource will not be
 *      interrupted. Note that acquisition may still fail due to internal
 *      reasons (such as an uncaught exception).
 *   2. Ensures that the `release` `Effect` value will not be interrupted,
 *      and will be executed as long as the acquisition `Effect` value
 *      successfully acquires the resource.
 *
 * During the time period between the acquisition and release of the resource,
 * the `use` `Effect` value will be executed.
 *
 * If the `release` `Effect` value fails, then the entire `Effect` value will
 * fail, even if the `use` `Effect` value succeeds. If this fail-fast behavior
 * is not desired, errors produced by the `release` `Effect` value can be caught
 * and ignored.
 *
 * @param acquire - The `Effect` value that acquires the resource.
 * @param use - The `Effect` value that is executed between the acquisition
 * and release of the resource.
 * @param release - The `Effect` value that releases the resource.
 *
 * @returns A new `Effect` value that represents the acquisition, use, and
 * release of the resource.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const acquireUseRelease: {
  <A2, E2, R2, A, X, R3>(
    use: (a: A) => Effect<A2, E2, R2>,
    release: (a: A, exit: Exit.Exit<A2, E2>) => Effect<X, never, R3>
  ): <E, R>(acquire: Effect<A, E, R>) => Effect<A2, E2 | E, R2 | R3 | R>
  <A, E, R, A2, E2, R2, X, R3>(
    acquire: Effect<A, E, R>,
    use: (a: A) => Effect<A2, E2, R2>,
    release: (a: A, exit: Exit.Exit<A2, E2>) => Effect<X, never, R3>
  ): Effect<A2, E | E2, R | R2 | R3>
} = core.acquireUseRelease

/**
 * This function adds a finalizer to the scope of the calling `Effect` value.
 * The finalizer is guaranteed to be run when the scope is closed, and it may
 * depend on the `Exit` value that the scope is closed with.
 *
 * @param finalizer - The finalizer to add to the scope of the calling
 * `Effect` value. This function must take an `Exit` value as its parameter,
 * and return a new `Effect` value.
 *
 * @returns A new `Effect` value that represents the addition of the finalizer
 * to the scope of the calling `Effect` value.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const addFinalizer: <X, R>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R>
) => Effect<void, never, Scope.Scope | R> = fiberRuntime.addFinalizer

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to be executed, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see the `acquireRelease` family of methods.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const ensuring: {
  <X, R1>(finalizer: Effect<X, never, R1>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R1 | R>
  <A, E, R, X, R1>(self: Effect<A, E, R>, finalizer: Effect<X, never, R1>): Effect<A, E, R1 | R>
} = fiberRuntime.ensuring

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const onError: {
  <E, X, R2>(
    cleanup: (cause: Cause.Cause<E>) => Effect<X, never, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Effect<A, E, R>,
    cleanup: (cause: Cause.Cause<E>) => Effect<X, never, R2>
  ): Effect<A, E, R2 | R>
} = core.onError

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const onExit: {
  <A, E, X, R2>(
    cleanup: (exit: Exit.Exit<A, E>) => Effect<X, never, R2>
  ): <R>(self: Effect<A, E, R>) => Effect<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Effect<A, E, R>,
    cleanup: (exit: Exit.Exit<A, E>) => Effect<X, never, R2>
  ): Effect<A, E, R | R2>
} = core.onExit

/**
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const parallelFinalizers: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.parallelFinalizers

/**
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const finalizersMask: (
  strategy: ExecutionStrategy
) => <A, E, R>(
  self: (restore: <A1, E1, R1>(self: Effect<A1, E1, R1>) => Effect<A1, E1, R1>) => Effect<A, E, R>
) => Effect<A, E, R> = fiberRuntime.finalizersMask

/**
 * Returns a new scoped workflow that runs finalizers added to the scope of
 * this workflow sequentially in the reverse of the order in which they were
 * added. Note that finalizers are run sequentially by default so this only
 * has meaning if used within a scope where finalizers are being run in
 * parallel.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const sequentialFinalizers: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> =
  fiberRuntime.sequentialFinalizers

/**
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const scope: Effect<Scope.Scope, never, Scope.Scope> = fiberRuntime.scope

/**
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const scopeWith: <A, E, R>(f: (scope: Scope.Scope) => Effect<A, E, R>) => Effect<A, E, R | Scope.Scope> =
  fiberRuntime.scopeWith

/**
 * Scopes all resources used in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const scoped: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, Exclude<R, Scope.Scope>> =
  fiberRuntime.scopedEffect

/**
 * Scopes all resources acquired by `resource` to the lifetime of `use`
 * without effecting the scope of any resources acquired by `use`.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const using: {
  <A, A2, E2, R2>(
    use: (a: A) => Effect<A2, E2, R2>
  ): <E, R>(self: Effect<A, E, R>) => Effect<A2, E2 | E, R2 | Exclude<R, Scope.Scope>>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    use: (a: A) => Effect<A2, E2, R2>
  ): Effect<A2, E | E2, R2 | Exclude<R, Scope.Scope>>
} = fiberRuntime.using

/**
 * Returns a new scoped workflow that returns the result of this workflow as
 * well as a finalizer that can be run to close the scope of this workflow.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const withEarlyRelease: <A, E, R>(
  self: Effect<A, E, R>
) => Effect<[Effect<void>, A], E, R | Scope.Scope> = fiberRuntime.withEarlyRelease

// -------------------------------------------------------------------------------------
// supervision & fibers
// -------------------------------------------------------------------------------------

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const awaitAllChildren: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = circular.awaitAllChildren

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const daemonChildren: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.daemonChildren

/**
 * Constructs an effect with information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const descriptor: Effect<Fiber.Fiber.Descriptor> = effect.descriptor

/**
 * Constructs an effect based on information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const descriptorWith: <A, E, R>(f: (descriptor: Fiber.Fiber.Descriptor) => Effect<A, E, R>) => Effect<A, E, R> =
  effect.descriptorWith

/**
 * Returns a new workflow that executes this one and captures the changes in
 * `FiberRef` values.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const diffFiberRefs: <A, E, R>(
  self: Effect<A, E, R>
) => Effect<[FiberRefsPatch.FiberRefsPatch, A], E, R> = effect.diffFiberRefs

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const ensuringChild: {
  <X, R2>(
    f: (fiber: Fiber.Fiber<ReadonlyArray<unknown>, any>) => Effect<X, never, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Effect<A, E, R>,
    f: (fiber: Fiber.Fiber<ReadonlyArray<unknown>, any>) => Effect<X, never, R2>
  ): Effect<A, E, R | R2>
} = circular.ensuringChild

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const ensuringChildren: {
  <X, R2>(
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<X, never, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R2 | R>
  <A, E, R, X, R2>(
    self: Effect<A, E, R>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<X, never, R2>
  ): Effect<A, E, R | R2>
} = circular.ensuringChildren

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fiberId: Effect<FiberId.FiberId> = core.fiberId

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fiberIdWith: <A, E, R>(f: (descriptor: FiberId.Runtime) => Effect<A, E, R>) => Effect<A, E, R> =
  core.fiberIdWith

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the effect.
 *
 * You can use the `fork` method whenever you want to execute an effect in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * effects. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods to interrupt the fiber and to
 * wait for it to finish executing the effect. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn` methods.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fork: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R> = fiberRuntime.fork

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkDaemon: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R> =
  fiberRuntime.forkDaemon

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkAll: {
  (
    options?: { readonly discard?: false | undefined } | undefined
  ): <Eff extends Effect<any, any, any>>(
    effects: Iterable<Eff>
  ) => Effect<Fiber.Fiber<Array<Effect.Success<Eff>>, Effect.Error<Eff>>, never, Effect.Context<Eff>>
  (
    options: { readonly discard: true }
  ): <Eff extends Effect<any, any, any>>(effects: Iterable<Eff>) => Effect<void, never, Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>>(
    effects: Iterable<Eff>,
    options?: { readonly discard?: false | undefined } | undefined
  ): Effect<Fiber.Fiber<Array<Effect.Success<Eff>>, Effect.Error<Eff>>, never, Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>>(
    effects: Iterable<Eff>,
    options: { readonly discard: true }
  ): Effect<void, never, Effect.Context<Eff>>
} = circular.forkAll

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkIn: {
  (scope: Scope.Scope): <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R>
  <A, E, R>(self: Effect<A, E, R>, scope: Scope.Scope): Effect<Fiber.RuntimeFiber<A, E>, never, R>
} = circular.forkIn

/**
 * Forks the fiber in a `Scope`, interrupting it when the scope is closed.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkScoped: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, Scope.Scope | R> =
  circular.forkScoped

/**
 * Like fork but handles an error with the provided handler.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkWithErrorHandler: {
  <E, X>(
    handler: (e: E) => Effect<X>
  ): <A, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    handler: (e: E) => Effect<X>
  ): Effect<Fiber.RuntimeFiber<A, E>, never, R>
} = fiberRuntime.forkWithErrorHandler

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fromFiber: <A, E>(fiber: Fiber.Fiber<A, E>) => Effect<A, E> = circular.fromFiber

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fromFiberEffect: <A, E, R>(fiber: Effect<Fiber.Fiber<A, E>, E, R>) => Effect<A, E, R> =
  circular.fromFiberEffect

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const supervised: {
  <X>(supervisor: Supervisor.Supervisor<X>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, X>(self: Effect<A, E, R>, supervisor: Supervisor.Supervisor<X>): Effect<A, E, R>
} = circular.supervised

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the fiber that
 * executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level scope,
 * effectively extending their lifespans into the parent scope.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const transplant: <A, E, R>(
  f: (grafter: <A2, E2, R2>(effect: Effect<A2, E2, R2>) => Effect<A2, E2, R2>) => Effect<A, E, R>
) => Effect<A, E, R> = core.transplant

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const withConcurrency: {
  (concurrency: number | "unbounded"): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, concurrency: number | "unbounded"): Effect<A, E, R>
} = core.withConcurrency

// ---------------------------------------------------------------------------------------
// scheduler
// ---------------------------------------------------------------------------------------

/**
 * Sets the provided scheduler for usage in the wrapped effect
 *
 * @since 2.0.0
 * @category scheduler
 */
export const withScheduler: {
  (scheduler: Scheduler.Scheduler): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, scheduler: Scheduler.Scheduler): Effect<A, E, R>
} = Scheduler.withScheduler

/**
 * Sets the scheduling priority used when yielding
 *
 * @since 2.0.0
 * @category utils
 */
export const withSchedulingPriority: {
  (priority: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, priority: number): Effect<A, E, R>
} = core.withSchedulingPriority

/**
 * Sets the maximum number of operations before yield by the default schedulers
 *
 * @since 2.0.0
 * @category utils
 */
export const withMaxOpsBeforeYield: {
  (priority: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, priority: number): Effect<A, E, R>
} = core.withMaxOpsBeforeYield

// ---------------------------------------------------------------------------------------
// clock
// ---------------------------------------------------------------------------------------

/**
 * Retreives the `Clock` service from the context
 *
 * @since 2.0.0
 * @category clock
 */
export const clock: Effect<Clock.Clock> = effect.clock

/**
 * Retreives the `Clock` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category clock
 */
export const clockWith: <A, E, R>(f: (clock: Clock.Clock) => Effect<A, E, R>) => Effect<A, E, R> = effect.clockWith

/**
 * Sets the implementation of the clock service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withClockScoped: <A extends Clock.Clock>(value: A) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withClockScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * clock service.
 *
 * @since 2.0.0
 * @category clock
 */
export const withClock: {
  <X extends Clock.Clock>(value: X): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <X extends Clock.Clock, A, E, R>(effect: Effect<A, E, R>, value: X): Effect<A, E, R>
} = defaultServices.withClock

// -------------------------------------------------------------------------------------
// console
// -------------------------------------------------------------------------------------

/**
 * Retreives the `Console` service from the context
 *
 * @since 2.0.0
 * @category console
 */
export const console: Effect<Console> = _console.console

/**
 * Retreives the `Console` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category console
 */
export const consoleWith: <A, E, R>(f: (console: Console) => Effect<A, E, R>) => Effect<A, E, R> = _console.consoleWith

/**
 * Sets the implementation of the console service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withConsoleScoped: <A extends Console>(console: A) => Effect<void, never, Scope.Scope> =
  _console.withConsoleScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * console service.
 *
 * @since 2.0.0
 * @category console
 */
export const withConsole: {
  <C extends Console>(console: C): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, C extends Console>(effect: Effect<A, E, R>, console: C): Effect<A, E, R>
} = _console.withConsole

// ---------------------------------------------------------------------------------------
// delays & timeouts
// ---------------------------------------------------------------------------------------

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const delay: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<A, E, R>
} = effect.delay

/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const sleep: (duration: Duration.DurationInput) => Effect<void> = effect.sleep

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timed: <A, E, R>(self: Effect<A, E, R>) => Effect<[Duration.Duration, A], E, R> = effect.timed

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timedWith: {
  <E1, R1>(
    nanoseconds: Effect<bigint, E1, R1>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[Duration.Duration, A], E1 | E, R1 | R>
  <A, E, R, E1, R1>(
    self: Effect<A, E, R>,
    nanoseconds: Effect<bigint, E1, R1>
  ): Effect<[Duration.Duration, A], E | E1, R | R1>
} = effect.timedWith

/**
 * Returns an effect that will timeout this effect, failing with a `Cause.TimeoutException`
 * if the timeout elapses before the effect has produced a value.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeout: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E | Cause.TimeoutException, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<A, Cause.TimeoutException | E, R>
} = circular.timeout

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @since 3.1.0
 * @category delays & timeouts
 */
export const timeoutOption: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<Option.Option<A>, E, R>
} = circular.timeoutOption

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeoutFail: {
  <E1>(
    options: { readonly onTimeout: LazyArg<E1>; readonly duration: Duration.DurationInput }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E1 | E, R>
  <A, E, R, E1>(
    self: Effect<A, E, R>,
    options: { readonly onTimeout: LazyArg<E1>; readonly duration: Duration.DurationInput }
  ): Effect<A, E | E1, R>
} = circular.timeoutFail

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeoutFailCause: {
  <E1>(
    options: { readonly onTimeout: LazyArg<Cause.Cause<E1>>; readonly duration: Duration.DurationInput }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E1 | E, R>
  <A, E, R, E1>(
    self: Effect<A, E, R>,
    options: { readonly onTimeout: LazyArg<Cause.Cause<E1>>; readonly duration: Duration.DurationInput }
  ): Effect<A, E | E1, R>
} = circular.timeoutFailCause

/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value or returning the result of applying the function `onSuccess` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeoutTo: {
  <A, B, B1>(
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ): <E, R>(self: Effect<A, E, R>) => Effect<B | B1, E, R>
  <A, E, R, B1, B>(
    self: Effect<A, E, R>,
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ): Effect<B1 | B, E, R>
} = circular.timeoutTo

// -------------------------------------------------------------------------------------
// config
// -------------------------------------------------------------------------------------

/**
 * Retrieves the default config provider, and passes it to the specified
 * function, which may return an effect that uses the provider to perform some
 * work or compute some value.
 *
 * @since 2.0.0
 * @category config
 */
export const configProviderWith: <A, E, R>(f: (configProvider: ConfigProvider) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.configProviderWith

/**
 * Executes the specified workflow with the specified configuration provider.
 *
 * @since 2.0.0
 * @category config
 */
export const withConfigProvider: {
  (value: ConfigProvider): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, value: ConfigProvider): Effect<A, E, R>
} = defaultServices.withConfigProvider

/**
 * Sets the configuration provider to the specified value and restores it to its original value
 * when the scope is closed.
 *
 * @since 2.0.0
 * @category config
 */
export const withConfigProviderScoped: (value: ConfigProvider) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withConfigProviderScoped

// -------------------------------------------------------------------------------------
// context
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category context
 */
export const context: <R>() => Effect<Context.Context<R>, never, R> = core.context

/**
 * Accesses the context of the effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<A, never, R> = effect.contextWith

/**
 * Effectually accesses the context of the effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithEffect: <R0, A, E, R>(
  f: (context: Context.Context<R0>) => Effect<A, E, R>
) => Effect<A, E, R | R0> = core.contextWithEffect

/**
 * Provides some of the context required to run this effect,
 * leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <A, E>(self: Effect<A, E, R>) => Effect<A, E, R0>
  <A, E, R, R0>(self: Effect<A, E, R>, f: (context: Context.Context<R0>) => Context.Context<R>): Effect<A, E, R0>
} = core.mapInputContext

/**
 * Splits the context into two parts, providing one part using the
 * specified layer/context/runtime and leaving the remainder `R0`
 *
 * @since 2.0.0
 * @category context
 */
export const provide: {
  <ROut, E2, RIn>(
    layer: Layer.Layer<ROut, E2, RIn>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2 | E, RIn | Exclude<R, ROut>>
  <R2>(context: Context.Context<R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, R2>>
  <R2>(runtime: Runtime.Runtime<R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, R2>>
  <A, E, R, ROut, E2, RIn>(
    self: Effect<A, E, R>,
    layer: Layer.Layer<ROut, E2, RIn>
  ): Effect<A, E | E2, RIn | Exclude<R, ROut>>
  <A, E, R, R2>(self: Effect<A, E, R>, context: Context.Context<R2>): Effect<A, E, Exclude<R, R2>>
  <A, E, R, R2>(self: Effect<A, E, R>, runtime: Runtime.Runtime<R2>): Effect<A, E, Exclude<R, R2>>
} = layer.effect_provide

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provide` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>>(
    self: Effect<A, E, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Effect<A, E, Exclude<R, Context.Tag.Identifier<T>>>
} = effect.provideService

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provide` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, E1, R1>(
    tag: T,
    effect: Effect<Context.Tag.Service<T>, E1, R1>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E1 | E, R1 | Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>, E1, R1>(
    self: Effect<A, E, R>,
    tag: T,
    effect: Effect<Context.Tag.Service<T>, E1, R1>
  ): Effect<A, E | E1, R1 | Exclude<R, Context.Tag.Identifier<T>>>
} = effect.provideServiceEffect

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunction: <T extends Effect<any, any, any>, Args extends Array<any>, A>(
  getService: T,
  f: (_: Effect.Success<T>) => (...args: Args) => A
) => (...args: Args) => Effect<A, Effect.Error<T>, Effect.Context<T>> = effect.serviceFunction

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunctionEffect: <T extends Effect<any, any, any>, Args extends Array<any>, A, E, R>(
  getService: T,
  f: (_: Effect.Success<T>) => (...args: Args) => Effect<A, E, R>
) => (...args: Args) => Effect<A, E | Effect.Error<T>, R | Effect.Context<T>> = effect.serviceFunctionEffect

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunctions: <S, SE, SR>(
  getService: Effect<S, SE, SR>
) => {
  [k in keyof S as S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never]: S[k] extends
    (...args: infer Args) => Effect<infer A, infer E, infer R> ? (...args: Args) => Effect<A, SE | E, SR | R>
    : never
} = effect.serviceFunctions as any

/**
 * @since 2.0.0
 * @category context
 */
export const serviceConstants: <S, SE, SR>(
  getService: Effect<S, SE, SR>
) => {
  [k in { [k in keyof S]: k }[keyof S]]: S[k] extends Effect<infer A, infer E, infer R> ? Effect<A, SE | E, SR | R>
    : Effect<S[k], SE, SR>
} = effect.serviceConstants

/**
 * @since 2.0.0
 * @category context
 */
export const serviceMembers: <S, SE, SR>(
  getService: Effect<S, SE, SR>
) => {
  functions: {
    [k in keyof S as S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never]: S[k] extends
      (...args: infer Args) => Effect<infer A, infer E, infer R> ? (...args: Args) => Effect<A, SE | E, SR | R>
      : never
  }
  constants: {
    [k in { [k in keyof S]: k }[keyof S]]: S[k] extends Effect<infer A, infer E, infer R> ? Effect<A, SE | E, SR | R>
      : Effect<S[k], SE, SR>
  }
} = effect.serviceMembers as any

/**
 * @since 2.0.0
 * @category context
 */
export const serviceOption: <I, S>(tag: Context.Tag<I, S>) => Effect<Option.Option<S>> = effect.serviceOption

/**
 * @since 2.0.0
 * @category context
 */
export const serviceOptional: <I, S>(tag: Context.Tag<I, S>) => Effect<S, Cause.NoSuchElementException> =
  effect.serviceOptional

/**
 * Updates the service with the required service entry.
 *
 * @since 2.0.0
 * @category context
 */
export const updateService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R | Context.Tag.Identifier<T>>
  <A, E, R, T extends Context.Tag<any, any>>(
    self: Effect<A, E, R>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): Effect<A, E, R | Context.Tag.Identifier<T>>
} = effect.updateService

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Effect` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link bind}
 * @see {@link bindTo}
 * @see {@link let_ let}
 *
 * @example
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 *
 * @category do notation
 * @since 2.0.0
 */
export const Do: Effect<{}> = effect.Do

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Effect` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link Do}
 * @see {@link bindTo}
 * @see {@link let_ let}
 *
 * @example
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 *
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, A extends object, B, E2, R2>(
    name: Exclude<N, keyof A>,
    f: (a: A) => Effect<B, E2, R2>
  ): <E1, R1>(self: Effect<A, E1, R1>) => Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E2 | E1, R2 | R1>
  <A extends object, N extends string, E1, R1, B, E2, R2>(
    self: Effect<A, E1, R1>,
    name: Exclude<N, keyof A>,
    f: (a: A) => Effect<B, E2, R2>
  ): Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E1 | E2, R1 | R2>
} = effect.bind

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Effect` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @see {@link Do}
 * @see {@link bind}
 * @see {@link let_ let}
 *
 * @example
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 *
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(name: N): <A, E, R>(self: Effect<A, E, R>) => Effect<{ [K in N]: A }, E, R>
  <A, E, R, N extends string>(self: Effect<A, E, R>, name: N): Effect<{ [K in N]: A }, E, R>
} = effect.bindTo

const let_: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): <E, R>(self: Effect<A, E, R>) => Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
  <A extends object, N extends string, E, R, B>(
    self: Effect<A, E, R>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
} = effect.let_

export {
  /**
   * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Effect` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @see {@link Do}
   * @see {@link bind}
   * @see {@link bindTo}
   *
   * @example
   * import { Effect, pipe } from "effect"
   *
   * const result = pipe(
   *   Effect.Do,
   *   Effect.bind("x", () => Effect.succeed(2)),
   *   Effect.bind("y", () => Effect.succeed(3)),
   *   Effect.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
   *
   * @category do notation
   * @since 2.0.0
   */
  let_ as let
}

// -------------------------------------------------------------------------------------
// conversions
// -------------------------------------------------------------------------------------

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 *
 * This method is useful for recovering from effects that may fail.
 *
 * The error parameter of the returned `Effect` is `never`, since it is
 * guaranteed the effect does not model failure.
 *
 * @since 2.0.0
 * @category conversions
 */
export const either: <A, E, R>(self: Effect<A, E, R>) => Effect<Either.Either<A, E>, never, R> = core.either

/**
 * @since 2.0.0
 * @category conversions
 */
export const exit: <A, E, R>(self: Effect<A, E, R>) => Effect<Exit.Exit<A, E>, never, R> = core.exit

/**
 * Returns an effect that will succeed or fail the specified `Deferred` based
 * upon the result of the effect. Also synchronizes interruption, so if the
 * provided effect is interrupted, the specified `Deferred` will be interrupted
 * as well.
 *
 * @since 2.0.0
 * @category conversions
 */
export const intoDeferred: {
  <A, E>(deferred: Deferred.Deferred<A, E>): <R>(self: Effect<A, E, R>) => Effect<boolean, never, R>
  <A, E, R>(self: Effect<A, E, R>, deferred: Deferred.Deferred<A, E>): Effect<boolean, never, R>
} = core.intoDeferred

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @since 2.0.0
 * @category conversions
 */
export const option: <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, never, R> = effect.option

// -------------------------------------------------------------------------------------
// filtering & conditionals
// -------------------------------------------------------------------------------------

const if_: {
  <A1, E1, R1, A2, E2, R2>(
    options: { readonly onTrue: LazyArg<Effect<A1, E1, R1>>; readonly onFalse: LazyArg<Effect<A2, E2, R2>> }
  ): <E = never, R = never>(self: boolean | Effect<boolean, E, R>) => Effect<A1 | A2, E1 | E2 | E, R1 | R2 | R>
  <A1, E1, R1, A2, E2, R2, E = never, R = never>(
    self: boolean | Effect<boolean, E, R>,
    options: { readonly onTrue: LazyArg<Effect<A1, E1, R1>>; readonly onFalse: LazyArg<Effect<A2, E2, R2>> }
  ): Effect<A1 | A2, E1 | E2 | E, R1 | R2 | R>
} = core.if_

export {
  /**
   * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
   *
   * @since 2.0.0
   * @category filtering & conditionals
   */
  if_ as if
}

/**
 * Filter the specified effect with the provided function, dying with specified
 * defect if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrDie: {
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>,
    orDieWith: (a: NoInfer<A>) => unknown
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
  <A>(
    predicate: Predicate<NoInfer<A>>,
    orDieWith: (a: NoInfer<A>) => unknown
  ): <E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, B extends A>(
    self: Effect<A, E, R>,
    refinement: Refinement<A, B>,
    orDieWith: (a: A) => unknown
  ): Effect<B, E, R>
  <A, E, R>(self: Effect<A, E, R>, predicate: Predicate<A>, orDieWith: (a: A) => unknown): Effect<A, E, R>
} = effect.filterOrDie

/**
 * Filter the specified effect with the provided function, dying with specified
 * message if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrDieMessage: {
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>,
    message: string
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
  <A>(predicate: Predicate<NoInfer<A>>, message: string): <E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, B extends A>(self: Effect<A, E, R>, refinement: Refinement<A, B>, message: string): Effect<B, E, R>
  <A, E, R>(self: Effect<A, E, R>, predicate: Predicate<A>, message: string): Effect<A, E, R>
} = effect.filterOrDieMessage

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrElse: {
  <A, B extends A, C, E2, R2>(
    refinement: Refinement<NoInfer<A>, B>,
    orElse: (a: NoInfer<A>) => Effect<C, E2, R2>
  ): <E, R>(self: Effect<A, E, R>) => Effect<B | C, E2 | E, R2 | R>
  <A, B, E2, R2>(
    predicate: Predicate<NoInfer<A>>,
    orElse: (a: NoInfer<A>) => Effect<B, E2, R2>
  ): <E, R>(self: Effect<A, E, R>) => Effect<A | B, E2 | E, R2 | R>
  <A, E, R, B extends A, C, E2, R2>(
    self: Effect<A, E, R>,
    refinement: Refinement<A, B>,
    orElse: (a: A) => Effect<C, E2, R2>
  ): Effect<B | C, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Effect<A, E, R>,
    predicate: Predicate<A>,
    orElse: (a: A) => Effect<B, E2, R2>
  ): Effect<A | B, E | E2, R | R2>
} = effect.filterOrElse

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the option to further
 * refine and narrow down the type of the success channel by providing a
 * [user-defined type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).
 * Let's explore this concept through an example:
 *
 * @example
 * import { Effect, pipe } from "effect"
 *
 * // Define a user interface
 * interface User {
 *   readonly name: string
 * }
 *
 * // Assume an asynchronous authentication function
 * declare const auth: () => Promise<User | null>
 *
 * const program = pipe(
 *   Effect.promise(() => auth()),
 *   Effect.filterOrFail(
 *     // Define a guard to narrow down the type
 *     (user): user is User => user !== null,
 *     () => new Error("Unauthorized")
 *   ),
 *   Effect.map((user) => user.name) // The 'user' here has type `User`, not `User | null`
 * )
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    refinement: Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Effect<A, E, R>) => Effect<A, E2 | E, R>
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, Cause.NoSuchElementException | E, R>
  <A>(predicate: Predicate<NoInfer<A>>): <E, R>(self: Effect<A, E, R>) => Effect<A, Cause.NoSuchElementException | E, R>
  <A, E, R, B extends A, E2>(
    self: Effect<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => E2
  ): Effect<B, E | E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, predicate: Predicate<A>, orFailWith: (a: A) => E2): Effect<A, E | E2, R>
  <A, E, R, B extends A>(
    self: Effect<A, E, R>,
    refinement: Refinement<A, B>
  ): Effect<B, E | Cause.NoSuchElementException, R>
  <A, E, R>(self: Effect<A, E, R>, predicate: Predicate<A>): Effect<A, E | Cause.NoSuchElementException, R>
} = effect.filterOrFail

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const unless: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, condition: LazyArg<boolean>): Effect<Option.Option<A>, E, R>
} = effect.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const unlessEffect: {
  <E2, R2>(
    condition: Effect<boolean, E2, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Effect<A, E, R>, condition: Effect<boolean, E2, R2>): Effect<Option.Option<A>, E | E2, R | R2>
} = effect.unlessEffect

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const when: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, condition: LazyArg<boolean>): Effect<Option.Option<A>, E, R>
} = effect.when

/**
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const whenEffect: {
  <E, R>(
    condition: Effect<boolean, E, R>
  ): <A, E2, R2>(effect: Effect<A, E2, R2>) => Effect<Option.Option<A>, E | E2, R | R2>
  <A, E2, R2, E, R>(self: Effect<A, E2, R2>, condition: Effect<boolean, E, R>): Effect<Option.Option<A>, E2 | E, R2 | R>
} = core.whenEffect

/**
 * Executes this workflow when value of the specified `FiberRef` satisfies the
 * predicate.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const whenFiberRef: {
  <S>(
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate<S>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[S, Option.Option<A>], E, R>
  <A, E, R, S>(
    self: Effect<A, E, R>,
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate<S>
  ): Effect<[S, Option.Option<A>], E, R>
} = effect.whenFiberRef

/**
 * Executes this workflow when the value of the `Ref` satisfies the predicate.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const whenRef: {
  <S>(ref: Ref.Ref<S>, predicate: Predicate<S>): <A, E, R>(self: Effect<A, E, R>) => Effect<[S, Option.Option<A>], E, R>
  <A, E, R, S>(self: Effect<A, E, R>, ref: Ref.Ref<S>, predicate: Predicate<S>): Effect<[S, Option.Option<A>], E, R>
} = effect.whenRef

// -------------------------------------------------------------------------------------
// sequencing
// -------------------------------------------------------------------------------------

/**
 * This function is a pipeable operator that maps over an `Effect` value,
 * flattening the result of the mapping function into a new `Effect` value.
 *
 * @param f - The mapping function to apply to the `Effect` value.
 * This function must return another `Effect` value.
 *
 * @returns A new `Effect` value that is the result of flattening the
 * mapped `Effect` value.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, B, E1, R1>(f: (a: A) => Effect<B, E1, R1>): <E, R>(self: Effect<A, E, R>) => Effect<B, E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(self: Effect<A, E, R>, f: (a: A) => Effect<B, E1, R1>): Effect<B, E | E1, R | R1>
} = core.flatMap

/**
 * Executes a sequence of two actions, typically two `Effect`s, where the second action can depend on the result of the first action.
 *
 * The `that` action can take various forms:
 *
 * - a value
 * - a function returning a value
 * - a promise
 * - a function returning a promise
 * - an effect
 * - a function returning an effect
 *
 * @example
 * import { Effect } from "effect"
 *
 * assert.deepStrictEqual(Effect.runSync(Effect.succeed("aa").pipe(Effect.andThen(1))), 1)
 * assert.deepStrictEqual(Effect.runSync(Effect.succeed("aa").pipe(Effect.andThen((s) => s.length))), 2)
 *
 * assert.deepStrictEqual(await Effect.runPromise(Effect.succeed("aa").pipe(Effect.andThen(Promise.resolve(1)))), 1)
 * assert.deepStrictEqual(await Effect.runPromise(Effect.succeed("aa").pipe(Effect.andThen((s) => Promise.resolve(s.length)))), 2)
 *
 * assert.deepStrictEqual(Effect.runSync(Effect.succeed("aa").pipe(Effect.andThen(Effect.succeed(1)))), 1)
 * assert.deepStrictEqual(Effect.runSync(Effect.succeed("aa").pipe(Effect.andThen((s) => Effect.succeed(s.length)))), 2)
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThen: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer A1, infer E1, infer R1>] ? Effect<A1, E | E1, R | R1>
    : [X] extends [PromiseLike<infer A1>] ? Effect<A1, E | Cause.UnknownException, R>
    : Effect<X, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer A1, infer E1, infer R1>] ? Effect<A1, E | E1, R | R1>
    : [X] extends [PromiseLike<infer A1>] ? Effect<A1, E | Cause.UnknownException, R>
    : Effect<X, E, R>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Effect<infer A1, infer E1, infer R1>] ? Effect<A1, E | E1, R | R1>
    : [X] extends [PromiseLike<infer A1>] ? Effect<A1, E | Cause.UnknownException, R>
    : Effect<X, E, R>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Effect<infer A1, infer E1, infer R1>] ? Effect<A1, E | E1, R | R1>
    : [X] extends [PromiseLike<infer A1>] ? Effect<A1, E | Cause.UnknownException, R>
    : Effect<X, E, R>
} = core.andThen

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <A, E1, R1, E, R>(self: Effect<Effect<A, E1, R1>, E, R>) => Effect<A, E | E1, R | R1> =
  core.flatten

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @since 2.0.0
 * @category sequencing
 */
export const raceAll: <Eff extends Effect<any, any, any>>(
  all: Iterable<Eff>
) => Effect<Effect.Success<Eff>, Effect.Error<Eff>, Effect.Context<Eff>> = fiberRuntime.raceAll

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const race: {
  <A2, E2, R2>(that: Effect<A2, E2, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: Effect<A2, E2, R2>): Effect<A | A2, E | E2, R | R2>
} = fiberRuntime.race

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const raceFirst: {
  <A2, E2, R2>(that: Effect<A2, E2, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: Effect<A2, E2, R2>): Effect<A | A2, E | E2, R | R2>
} = circular.raceFirst

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const raceWith: {
  <A1, E1, R1, E, A, A2, E2, R2, A3, E3, R3>(
    other: Effect<A1, E1, R1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<A, E>, fiber: Fiber.Fiber<A1, E1>) => Effect<A2, E2, R2>
      readonly onOtherDone: (exit: Exit.Exit<A1, E1>, fiber: Fiber.Fiber<A, E>) => Effect<A3, E3, R3>
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, E2 | E3, R1 | R2 | R3 | R>
  <A, E, R, A1, E1, R1, A2, E2, R2, A3, E3, R3>(
    self: Effect<A, E, R>,
    other: Effect<A1, E1, R1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<A, E>, fiber: Fiber.Fiber<A1, E1>) => Effect<A2, E2, R2>
      readonly onOtherDone: (exit: Exit.Exit<A1, E1>, fiber: Fiber.Fiber<A, E>) => Effect<A3, E3, R3>
    }
  ): Effect<A2 | A3, E2 | E3, R | R1 | R2 | R3>
} = fiberRuntime.raceWith

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const summarized: {
  <B, E2, R2, C>(
    summary: Effect<B, E2, R2>,
    f: (start: B, end: B) => C
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[C, A], E2 | E, R2 | R>
  <A, E, R, B, E2, R2, C>(
    self: Effect<A, E, R>,
    summary: Effect<B, E2, R2>,
    f: (start: B, end: B) => C
  ): Effect<[C, A], E2 | E, R2 | R>
} = effect.summarized

/**
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
} = core.tap

/**
 * Inspects both success and failure outcomes of an effect, performing different actions based on the result.
 *
 * @example
 * import { Effect, Random, Console } from "effect"
 *
 * // Simulate an effect that might fail
 * const task = Effect.filterOrFail(
 *   Random.nextRange(-1, 1),
 *   (n) => n >= 0,
 *   () => "random number is negative"
 * )
 *
 * // Define an effect that logs both success and failure outcomes of the 'task'
 * const tapping = Effect.tapBoth(task, {
 *   onFailure: (error) => Console.log(`failure: ${error}`),
 *   onSuccess: (randomNumber) => Console.log(`random number: ${randomNumber}`)
 * })
 *
 * Effect.runFork(tapping)
 * // Example Output:
 * // failure: random number is negative
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <E, X, E2, R2, A, X1, E3, R3>(
    options: {
      readonly onFailure: (e: NoInfer<E>) => Effect<X, E2, R2>
      readonly onSuccess: (a: NoInfer<A>) => Effect<X1, E3, R3>
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A, E | E2 | E3, R2 | R3 | R>
  <A, E, R, X, E2, R2, X1, E3, R3>(
    self: Effect<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Effect<X, E2, R2>
      readonly onSuccess: (a: A) => Effect<X1, E3, R3>
    }
  ): Effect<A, E | E2 | E3, R | R2 | R3>
} = effect.tapBoth

/**
 * Specifically inspects non-recoverable failures or defects in an effect (i.e., one or more `Die` causes).
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * // Create an effect that is designed to fail, simulating an occurrence of a network error
 * const task1: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * // this won't log anything because is not a defect
 * const tapping1 = Effect.tapDefect(task1, (cause) =>
 *   Console.log(`defect: ${cause}`)
 * )
 *
 * Effect.runFork(tapping1)
 * // No Output
 *
 * // Simulate a severe failure in the system by causing a defect with a specific message.
 * const task2: Effect.Effect<number, string> = Effect.dieMessage(
 *   "Something went wrong"
 * )
 *
 * // This will only log defects, not errors
 * const tapping2 = Effect.tapDefect(task2, (cause) =>
 *   Console.log(`defect: ${cause}`)
 * )
 *
 * Effect.runFork(tapping2)
 * // Output:
 * // defect: RuntimeException: Something went wrong
 * //   ... stack trace ...
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapDefect: {
  <X, E2, R2>(
    f: (cause: Cause.Cause<never>) => Effect<X, E2, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(
    self: Effect<A, E, R>,
    f: (cause: Cause.Cause<never>) => Effect<X, E2, R2>
  ): Effect<A, E | E2, R | R2>
} = effect.tapDefect

/**
 * Executes an effectful operation to inspect the failure of an effect without altering it.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * // Create an effect that is designed to fail, simulating an occurrence of a network error
 * const task: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * // Log the error message if the task fails. This function only executes if there is an error,
 * // providing a method to handle or inspect errors without altering the outcome of the original effect.
 * const tapping = Effect.tapError(task, (error) =>
 *   Console.log(`expected error: ${error}`)
 * )
 *
 * Effect.runFork(tapping)
 * // Output:
 * // expected error: NetworkError
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, X, E2, R2>(
    f: (e: NoInfer<E>) => Effect<X, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(self: Effect<A, E, R>, f: (e: E) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2>
} = effect.tapError

/**
 * Specifically inspects a failure with a particular tag, allowing focused error handling.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * class NetworkError {
 *   readonly _tag = "NetworkError"
 *   constructor(readonly statusCode: number) {}
 * }
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 *   constructor(readonly field: string) {}
 * }
 *
 * // Create an effect that is designed to fail, simulating an occurrence of a network error
 * const task: Effect.Effect<number, NetworkError | ValidationError> =
 *   Effect.fail(new NetworkError(504))
 *
 * // Apply an error handling function only to errors tagged as "NetworkError",
 * // and log the corresponding status code of the error.
 * const tapping = Effect.tapErrorTag(task, "NetworkError", (error) =>
 *   Console.log(`expected error: ${error.statusCode}`)
 * )
 *
 * Effect.runFork(tapping)
 * // Output:
 * // expected error: 504
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapErrorTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E1, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, A1, E1, R1>(
    self: Effect<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1>
} = effect.tapErrorTag

/**
 * Inspects the underlying cause of an effect's failure.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * // Create an effect that is designed to fail, simulating an occurrence of a network error
 * const task1: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * // This will log the cause of any expected error or defect
 * const tapping1 = Effect.tapErrorCause(task1, (cause) =>
 *   Console.log(`error cause: ${cause}`)
 * )
 *
 * Effect.runFork(tapping1)
 * // Output:
 * // error cause: Error: NetworkError
 *
 * // Simulate a severe failure in the system by causing a defect with a specific message.
 * const task2: Effect.Effect<number, string> = Effect.dieMessage(
 *   "Something went wrong"
 * )
 *
 * // This will log the cause of any expected error or defect
 * const tapping2 = Effect.tapErrorCause(task2, (cause) =>
 *   Console.log(`error cause: ${cause}`)
 * )
 *
 * Effect.runFork(tapping2)
 * // Output:
 * // error cause: RuntimeException: Something went wrong
 * //   ... stack trace ...
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapErrorCause: {
  <E, X, E2, R2>(
    f: (cause: Cause.Cause<NoInfer<E>>) => Effect<X, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(
    self: Effect<A, E, R>,
    f: (cause: Cause.Cause<E>) => Effect<X, E2, R2>
  ): Effect<A, E | E2, R | R2>
} = effect.tapErrorCause

// -------------------------------------------------------------------------------------
// repetition / recursion
// -------------------------------------------------------------------------------------

/**
 * Repeats this effect forever (until the first error).
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const forever: <A, E, R>(self: Effect<A, E, R>) => Effect<never, E, R> = effect.forever

/**
 * The `Effect.iterate` function allows you to iterate with an effectful operation. It uses an effectful `body` operation to change the state during each iteration and continues the iteration as long as the `while` function evaluates to `true`:
 *
 * ```ts
 * Effect.iterate(initial, options: { while, body })
 * ```
 *
 * We can think of `Effect.iterate` as equivalent to a `while` loop in JavaScript:
 *
 * ```ts
 * let result = initial
 *
 * while (options.while(result)) {
 *   result = options.body(result)
 * }
 *
 * return result
 * ```
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const iterate: {
  <A, B extends A, R, E>(
    initial: A,
    options: {
      readonly while: Refinement<A, B>
      readonly body: (b: B) => Effect<A, E, R>
    }
  ): Effect<A, E, R>
  <A, R, E>(
    initial: A,
    options: {
      readonly while: Predicate<A>
      readonly body: (a: A) => Effect<A, E, R>
    }
  ): Effect<A, E, R>
} = effect.iterate

/**
 * The `Effect.loop` function allows you to repeatedly change the state based on an `step` function until a condition given by the `while` function is evaluated to `true`:
 *
 * ```ts
 * Effect.loop(initial, options: { while, step, body })
 * ```
 *
 * It collects all intermediate states in an array and returns it as the final result.
 *
 * We can think of Effect.loop as equivalent to a while loop in JavaScript:
 *
 * ```ts
 * let state = initial
 * const result = []
 *
 * while (options.while(state)) {
 *   result.push(options.body(state))
 *   state = options.step(state)
 * }
 *
 * return result
 * ```
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const loop: {
  <A, B extends A, C, E, R>(
    initial: A,
    options: {
      readonly while: Refinement<A, B>
      readonly step: (b: B) => A
      readonly body: (b: B) => Effect<C, E, R>
      readonly discard?: false | undefined
    }
  ): Effect<Array<C>, E, R>
  <A, C, E, R>(
    initial: A,
    options: {
      readonly while: (a: A) => boolean
      readonly step: (a: A) => A
      readonly body: (a: A) => Effect<C, E, R>
      readonly discard?: false | undefined
    }
  ): Effect<Array<C>, E, R>
  <A, B extends A, C, E, R>(
    initial: A,
    options: {
      readonly while: Refinement<A, B>
      readonly step: (b: B) => A
      readonly body: (b: B) => Effect<C, E, R>
      readonly discard: true
    }
  ): Effect<void, E, R>
  <A, C, E, R>(
    initial: A,
    options: {
      readonly while: (a: A) => boolean
      readonly step: (a: A) => A
      readonly body: (a: A) => Effect<C, E, R>
      readonly discard: true
    }
  ): Effect<void, E, R>
} = effect.loop

/**
 * @since 2.0.0
 * @category repetition / recursion
 */
export declare namespace Repeat {
  /**
   * @since 2.0.0
   * @category repetition / recursion
   */
  export type Return<R, E, A, O extends Options<A>> = Effect<
    (O extends { schedule: Schedule.Schedule<infer Out, infer _I, infer _R> } ? Out
      : O extends { until: Refinement<A, infer B> } ? B
      : A),
    | E
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer E, infer _R> } ? E : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer E, infer _R> } ? E : never),
    | R
    | (O extends { schedule: Schedule.Schedule<infer _O, infer _I, infer R> } ? R : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer _E, infer R> } ? R : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer _E, infer R> } ? R : never)
  > extends infer Z ? Z : never

  /**
   * @since 2.0.0
   * @category repetition / recursion
   */
  export interface Options<A> {
    while?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined
    until?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined
    times?: number | undefined
    schedule?: Schedule.Schedule<any, A, any> | undefined
  }
}

/**
 * The `repeat` function returns a new effect that repeats the given effect
 * according to a specified schedule or until the first failure. The scheduled
 * recurrences are in addition to the initial execution, so `Effect.repeat(action,
 * Schedule.once)` executes `action` once initially, and if it succeeds, repeats it
 * an additional time.
 *
 * @example
 * // Success Example
 * import { Effect, Schedule, Console } from "effect"
 *
 * const action = Console.log("success")
 * const policy = Schedule.addDelay(Schedule.recurs(2), () => "100 millis")
 * const program = Effect.repeat(action, policy)
 *
 * Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
 *
 * @example
 * // Failure Example
 * import { Effect, Schedule } from "effect"
 *
 * let count = 0
 *
 * // Define an async effect that simulates an action with possible failures
 * const action = Effect.async<string, string>((resume) => {
 *   if (count > 1) {
 *     console.log("failure")
 *     resume(Effect.fail("Uh oh!"))
 *   } else {
 *     count++
 *     console.log("success")
 *     resume(Effect.succeed("yay!"))
 *   }
 * })
 *
 * const policy = Schedule.addDelay(Schedule.recurs(2), () => "100 millis")
 * const program = Effect.repeat(action, policy)
 *
 * Effect.runPromiseExit(program).then(console.log)
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeat: {
  <O extends Repeat.Options<A>, A>(
    options: O
  ): <E, R>(
    self: Effect<A, E, R>
  ) => Repeat.Return<R, E, A, O>
  <B, A, R1>(
    schedule: Schedule.Schedule<B, A, R1>
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R1 | R>
  <A, E, R, O extends Repeat.Options<A>>(
    self: Effect<A, E, R>,
    options: O
  ): Repeat.Return<R, E, A, O>
  <A, E, R, B, R1>(self: Effect<A, E, R>, schedule: Schedule.Schedule<B, A, R1>): Effect<B, E, R | R1>
} = _schedule.repeat_combined

/**
 * The `repeatN` function returns a new effect that repeats the specified effect a
 * given number of times or until the first failure. The repeats are in addition
 * to the initial execution, so `Effect.repeatN(action, 1)` executes `action` once
 * initially and then repeats it one additional time if it succeeds.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * const action = Console.log("success")
 * const program = Effect.repeatN(action, 2)
 *
 * Effect.runPromise(program)
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatN: {
  (n: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, n: number): Effect<A, E, R>
} = effect.repeatN

/**
 * The `repeatOrElse` function returns a new effect that repeats the specified
 * effect according to the given schedule or until the first failure. When a
 * failure occurs, the failure value and schedule output are passed to a
 * specified handler. Scheduled recurrences are in addition to the initial
 * execution, so `Effect.repeat(action, Schedule.once)` executes `action` once
 * initially and then repeats it an additional time if it succeeds.
 *
 * @example
 * import { Effect, Schedule } from "effect"
 *
 * let count = 0
 *
 * // Define an async effect that simulates an action with possible failures
 * const action = Effect.async<string, string>((resume) => {
 *   if (count > 1) {
 *     console.log("failure")
 *     resume(Effect.fail("Uh oh!"))
 *   } else {
 *     count++
 *     console.log("success")
 *     resume(Effect.succeed("yay!"))
 *   }
 * })
 *
 * const policy = Schedule.addDelay(
 *   Schedule.recurs(2), // Repeat for a maximum of 2 times
 *   () => "100 millis" // Add a delay of 100 milliseconds between repetitions
 * )
 *
 * const program = Effect.repeatOrElse(action, policy, () =>
 *   Effect.sync(() => {
 *     console.log("orElse")
 *     return count - 1
 *   })
 * )
 *
 * Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatOrElse: {
  <R2, A, B, E, E2, R3>(
    schedule: Schedule.Schedule<B, A, R2>,
    orElse: (error: E, option: Option.Option<B>) => Effect<B, E2, R3>
  ): <R>(self: Effect<A, E, R>) => Effect<B, E2, R2 | R3 | R>
  <A, E, R, R2, B, E2, R3>(
    self: Effect<A, E, R>,
    schedule: Schedule.Schedule<B, A, R2>,
    orElse: (error: E, option: Option.Option<B>) => Effect<B, E2, R3>
  ): Effect<B, E2, R | R2 | R3>
} = _schedule.repeatOrElse_Effect

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const schedule: {
  <R2, Out>(schedule: Schedule.Schedule<Out, unknown, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<Out, E, R2 | R>
  <A, E, R, R2, Out>(self: Effect<A, E, R>, schedule: Schedule.Schedule<Out, unknown, R2>): Effect<Out, E, R | R2>
} = _schedule.schedule_Effect

/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const scheduleForked: {
  <Out, R2>(
    schedule: Schedule.Schedule<Out, unknown, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<Out, E>, never, Scope.Scope | R2 | R>
  <A, E, R, Out, R2>(
    self: Effect<A, E, R>,
    schedule: Schedule.Schedule<Out, unknown, R2>
  ): Effect<Fiber.RuntimeFiber<Out, E>, never, Scope.Scope | R | R2>
} = circular.scheduleForked

/**
 * Runs this effect according to the specified schedule starting from the
 * specified input value.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const scheduleFrom: {
  <R2, In, Out>(
    initial: In,
    schedule: Schedule.Schedule<Out, In, R2>
  ): <E, R>(self: Effect<In, E, R>) => Effect<Out, E, R2 | R>
  <In, E, R, R2, Out>(
    self: Effect<In, E, R>,
    initial: In,
    schedule: Schedule.Schedule<Out, In, R2>
  ): Effect<Out, E, R | R2>
} = _schedule.scheduleFrom_Effect

/**
 * @since 2.0.0
 * @category repetition / recursion
 */
export const whileLoop: <A, E, R>(
  options: {
    readonly while: LazyArg<boolean>
    readonly body: LazyArg<Effect<A, E, R>>
    readonly step: (a: A) => void
  }
) => Effect<void, E, R> = core.whileLoop

// -------------------------------------------------------------------------------------
// fiber refs
// -------------------------------------------------------------------------------------

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const getFiberRefs: Effect<FiberRefs.FiberRefs> = effect.fiberRefs

/**
 * Inherits values from all `FiberRef` instances into current fiber.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const inheritFiberRefs: (childFiberRefs: FiberRefs.FiberRefs) => Effect<void> = effect.inheritFiberRefs

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <B, E, R>(use: Effect<B, E, R>) => Effect<B, E, R>
  <B, E, R, A>(use: Effect<B, E, R>, self: FiberRef.FiberRef<A>, value: A): Effect<B, E, R>
} = core.fiberRefLocally

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyWith: {
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): <B, E, R>(use: Effect<B, E, R>) => Effect<B, E, R>
  <B, E, R, A>(use: Effect<B, E, R>, self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<B, E, R>
} = core.fiberRefLocallyWith

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyScoped: {
  <A>(value: A): (self: FiberRef.FiberRef<A>) => Effect<void, never, Scope.Scope>
  <A>(self: FiberRef.FiberRef<A>, value: A): Effect<void, never, Scope.Scope>
} = fiberRuntime.fiberRefLocallyScoped

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyScopedWith: {
  <A>(f: (a: A) => A): (self: FiberRef.FiberRef<A>) => Effect<void, never, Scope.Scope>
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<void, never, Scope.Scope>
} = fiberRuntime.fiberRefLocallyScopedWith

/**
 * Applies the specified changes to the `FiberRef` values for the fiber
 * running this workflow.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const patchFiberRefs: (patch: FiberRefsPatch.FiberRefsPatch) => Effect<void> = effect.patchFiberRefs

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const setFiberRefs: (fiberRefs: FiberRefs.FiberRefs) => Effect<void> = effect.setFiberRefs

/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const updateFiberRefs: (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
) => Effect<void> = effect.updateFiberRefs

// -------------------------------------------------------------------------------------
// getters & folding
// -------------------------------------------------------------------------------------

/**
 * Returns `true` if this effect is a failure, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const isFailure: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isFailure

/**
 * Returns `true` if this effect is a success, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const isSuccess: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isSuccess

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match`.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const match: {
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: Effect<A, E, R>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Effect<A2 | A3, never, R>
} = effect.match

/**
 * @since 2.0.0
 * @category getters & folding
 */
export const matchCause: {
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: Effect<A, E, R>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): Effect<A2 | A3, never, R>
} = core.matchCause

/**
 * @since 2.0.0
 * @category getters & folding
 */
export const matchCauseEffect: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>
      readonly onSuccess: (a: A) => Effect<A3, E3, R3>
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Effect<A, E, R>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>
      readonly onSuccess: (a: A) => Effect<A3, E3, R3>
    }
  ): Effect<A2 | A3, E2 | E3, R2 | R3 | R>
} = core.matchCauseEffect

/**
 * @since 2.0.0
 * @category getters & folding
 */
export const matchEffect: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (e: E) => Effect<A2, E2, R2>
      readonly onSuccess: (a: A) => Effect<A3, E3, R3>
    }
  ): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Effect<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Effect<A2, E2, R2>
      readonly onSuccess: (a: A) => Effect<A3, E3, R3>
    }
  ): Effect<A2 | A3, E2 | E3, R2 | R3 | R>
} = core.matchEffect

// -------------------------------------------------------------------------------------
// logging
// -------------------------------------------------------------------------------------

/**
 * Logs the specified message or cause at the current log level.
 *
 * You can set the current log level using `FiberRef.currentLogLevel`.
 *
 * @since 2.0.0
 * @category logging
 */
export const log: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.log

/**
 * Logs the specified message or cause at the specified log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logWithLevel = (
  level: LogLevel,
  ...message: ReadonlyArray<any>
): Effect<void> => effect.logWithLevel(level)(...message)

/**
 * Logs the specified message or cause at the Trace log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logTrace: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logTrace

/**
 * Logs the specified message or cause at the Debug log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logDebug: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logDebug

/**
 * Logs the specified message or cause at the Info log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logInfo: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logInfo

/**
 * Logs the specified message or cause at the Warning log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logWarning: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logWarning

/**
 * Logs the specified message or cause at the Error log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logError: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logError

/**
 * Logs the specified message or cause at the Fatal log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logFatal: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logFatal

/**
 * Adjusts the label for the current logging span.
 *
 * @since 2.0.0
 * @category logging
 */
export const withLogSpan: {
  (label: string): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, label: string): Effect<A, E, R>
} = effect.withLogSpan

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @since 2.0.0
 * @category logging
 */
export const annotateLogs: {
  (key: string, value: unknown): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, unknown>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: unknown): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, unknown>): Effect<A, E, R>
} = effect.annotateLogs

/**
 * Annotates each log with the specified log annotation(s), until the Scope is closed.
 *
 * @since 3.1.0
 * @category logging
 * @example
 * import { Effect } from "effect"
 *
 * Effect.gen(function*() {
 *   yield* Effect.log("no annotations")
 *   yield* Effect.annotateLogsScoped({ foo: "bar" })
 *   yield* Effect.log("annotated with foo=bar")
 * }).pipe(
 *   Effect.scoped,
 *   Effect.andThen(Effect.log("no annotations again"))
 * )
 */
export const annotateLogsScoped: {
  (key: string, value: unknown): Effect<void, never, Scope.Scope>
  (values: Record<string, unknown>): Effect<void, never, Scope.Scope>
} = fiberRuntime.annotateLogsScoped

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @since 2.0.0
 * @category logging
 */
export const logAnnotations: Effect<HashMap.HashMap<string, unknown>> = effect.logAnnotations

/**
 * Decides wether child fibers will report or not unhandled errors via the logger
 *
 * @since 2.0.0
 * @category logging
 */
export const withUnhandledErrorLogLevel: {
  (level: Option.Option<LogLevel>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, level: Option.Option<LogLevel>): Effect<A, E, R>
} = core.withUnhandledErrorLogLevel

// -------------------------------------------------------------------------------------
// alternatives
// -------------------------------------------------------------------------------------

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orDie: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = core.orDie

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <A, R>(self: Effect<A, E, R>) => Effect<A, never, R>
  <A, E, R>(self: Effect<A, E, R>, f: (error: E) => unknown): Effect<A, never, R>
} = core.orDieWith

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElse: {
  <A2, E2, R2>(that: LazyArg<Effect<A2, E2, R2>>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: LazyArg<Effect<A2, E2, R2>>): Effect<A2 | A, E2, R2 | R>
} = core.orElse

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElseFail: {
  <E2>(evaluate: LazyArg<E2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, evaluate: LazyArg<E2>): Effect<A, E2, R>
} = effect.orElseFail

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElseSucceed: {
  <A2>(evaluate: LazyArg<A2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, never, R>
  <A, E, R, A2>(self: Effect<A, E, R>, evaluate: LazyArg<A2>): Effect<A | A2, never, R>
} = effect.orElseSucceed

// -------------------------------------------------------------------------------------
// random
// -------------------------------------------------------------------------------------

/**
 * Retreives the `Random` service from the context.
 *
 * @since 2.0.0
 * @category random
 */
export const random: Effect<Random.Random> = effect.random

/**
 * Retreives the `Random` service from the context and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 * @category random
 */
export const randomWith: <A, E, R>(f: (random: Random.Random) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.randomWith

/**
 * Executes the specified workflow with the specified implementation of the
 * random service.
 *
 * @since 2.0.0
 * @category random
 */
export const withRandom: {
  <X extends Random.Random>(value: X): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <X extends Random.Random, A, E, R>(effect: Effect<A, E, R>, value: X): Effect<A, E, R>
} = defaultServices.withRandom

/**
 * Sets the implementation of the random service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withRandomScoped: <A extends Random.Random>(value: A) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withRandomScoped

// -------------------------------------------------------------------------------------
// runtime
// -------------------------------------------------------------------------------------

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect code.
 *
 * @since 2.0.0
 * @category runtime
 */
export const runtime: <R = never>() => Effect<Runtime.Runtime<R>, never, R> = _runtime.runtime

/**
 * Retrieves an effect that succeeds with the current runtime flags, which
 * govern behavior and features of the runtime system.
 *
 * @since 2.0.0
 * @category runtime
 */
export const getRuntimeFlags: Effect<RuntimeFlags.RuntimeFlags> = core.runtimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const patchRuntimeFlags: (patch: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<void> = core.updateRuntimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const withRuntimeFlagsPatch: {
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, update: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect<A, E, R>
} = core.withRuntimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const withRuntimeFlagsPatchScoped: (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => Effect<void, never, Scope.Scope> = fiberRuntime.withRuntimeFlagsScoped

// -------------------------------------------------------------------------------------
// metrics
// -------------------------------------------------------------------------------------

/**
 * Tags each metric in this effect with the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const tagMetrics: {
  (key: string, value: string): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, string>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: string): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, string>): Effect<A, E, R>
} = effect.tagMetrics

/**
 * Tags each metric in this effect with the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const labelMetrics: {
  (labels: Iterable<MetricLabel.MetricLabel>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, labels: Iterable<MetricLabel.MetricLabel>): Effect<A, E, R>
} = effect.labelMetrics

/**
 * Tags each metric in a scope with a the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const tagMetricsScoped: (key: string, value: string) => Effect<void, never, Scope.Scope> =
  fiberRuntime.tagMetricsScoped

/**
 * Tags each metric in a scope with a the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const labelMetricsScoped: (
  labels: ReadonlyArray<MetricLabel.MetricLabel>
) => Effect<void, never, Scope.Scope> = fiberRuntime.labelMetricsScoped

/**
 * Retrieves the metric labels associated with the current scope.
 *
 * @since 2.0.0
 * @category metrics
 */
export const metricLabels: Effect<ReadonlyArray<MetricLabel.MetricLabel>> = core.metricLabels

/**
 * @since 2.0.0
 * @category metrics
 */
export const withMetric: {
  <Type, In, Out>(metric: Metric.Metric<Type, In, Out>): <A extends In, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A extends In, E, R, Type, In, Out>(self: Effect<A, E, R>, metric: Metric.Metric<Type, In, Out>): Effect<A, E, R>
} = effect.withMetric

// -------------------------------------------------------------------------------------
// semaphore
// -------------------------------------------------------------------------------------

/**
 * @category semaphore
 * @since 2.0.0
 */
export interface Permit {
  readonly index: number
}

/**
 * @category semaphore
 * @since 2.0.0
 */
export interface Semaphore {
  /** when the given amount of permits are available, run the effect and release the permits when finished */
  withPermits(permits: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  /** take the given amount of permits, suspending if they are not yet available */
  take(permits: number): Effect<number>
  /** release the given amount of permits, and return the resulting available permits */
  release(permits: number): Effect<number>
  /** release all the taken permits, and return the resulting available permits */
  releaseAll: Effect<number>
}

/**
 * Unsafely creates a new Semaphore
 *
 * @since 2.0.0
 * @category semaphore
 */
export const unsafeMakeSemaphore: (permits: number) => Semaphore = circular.unsafeMakeSemaphore

/**
 * Creates a new Semaphore
 *
 * @since 2.0.0
 * @category semaphore
 */
export const makeSemaphore: (permits: number) => Effect<Semaphore> = circular.makeSemaphore

// -------------------------------------------------------------------------------------
// execution
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category execution
 */
export const runFork: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunForkOptions
) => Fiber.RuntimeFiber<A, E> = _runtime.unsafeForkEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runCallback: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunCallbackOptions<A, E> | undefined
) => Runtime.Cancel<A, E> = _runtime.unsafeRunEffect

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * result of the workflow or rejects with an error.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromise: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<A> = _runtime.unsafeRunPromiseEffect

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * `Exit` value of the workflow.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromiseExit: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<Exit.Exit<A, E>> = _runtime.unsafeRunPromiseExitEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runSync: <A, E>(effect: Effect<A, E>) => A = _runtime.unsafeRunSyncEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runSyncExit: <A, E>(effect: Effect<A, E>) => Exit.Exit<A, E> = _runtime.unsafeRunSyncExitEffect

// -------------------------------------------------------------------------------------
// zipping
// -------------------------------------------------------------------------------------

/**
 * Sequentially zips the this result with the specified result. Combines both
 * `Cause`s when both effects fail.
 *
 * @since 2.0.0
 * @category zipping
 */
export const validate: {
  <B, E1, R1>(
    that: Effect<B, E1, R1>,
    options?: {
      /**
       * @since 2.0.0
       * @category supervision & fibers
       */
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    } | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[A, B], E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(
    self: Effect<A, E, R>,
    that: Effect<B, E1, R1>,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<[A, B], E | E1, R | R1>
} = fiberRuntime.validate

/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @since 2.0.0
 * @category zipping
 */
export const validateWith: {
  <B, E1, R1, A, C>(
    that: Effect<B, E1, R1>,
    f: (a: A, b: B) => C,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): <E, R>(self: Effect<A, E, R>) => Effect<C, E1 | E, R1 | R>
  <A, E, R, B, E1, R1, C>(
    self: Effect<A, E, R>,
    that: Effect<B, E1, R1>,
    f: (a: A, b: B) => C,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<C, E | E1, R | R1>
} = fiberRuntime.validateWith

/**
 * The `Effect.zip` function allows you to combine two effects into a single
 * effect. This combined effect yields a tuple containing the results of both
 * input effects once they succeed.
 *
 * Note that `Effect.zip` processes effects sequentially: it first completes the
 * effect on the left and then the effect on the right.
 *
 * If you want to run the effects concurrently, you can use the `concurrent` option.
 *
 * @example
 * import { Effect } from "effect"
 *
 * const task1 = Effect.succeed(1).pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Effect.log("task1 done"))
 * )
 * const task2 = Effect.succeed("hello").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Effect.log("task2 done"))
 * )
 *
 * const task3 = Effect.zip(task1, task2)
 *
 * Effect.runPromise(task3).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // [ 1, 'hello' ]
 *
 * @example
 * import { Effect } from "effect"
 *
 * const task1 = Effect.succeed(1).pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Effect.log("task1 done"))
 * )
 * const task2 = Effect.succeed("hello").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Effect.log("task2 done"))
 * )
 *
 * const task3 = Effect.zip(task1, task2, { concurrent: true })
 *
 * Effect.runPromise(task3).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // [ 1, 'hello' ]
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<[A, A2], E | E2, R | R2>
} = fiberRuntime.zipOptions

/**
 * Sequentially run this effect with the specified effect, _discarding_ the result
 * of the second effect (`that`) in the chain.
 *
 * `{ concurrent: true }` can be passed to the options to make it a concurrent execution
 * of both effects instead of sequential.
 *
 * @example
 *
 * import { Effect } from 'effect';
 *
 * const effect = Effect.succeed("a message").pipe(
 *   Effect.zipLeft(Effect.succeed(42)),
 * )
 *
 * assert.deepStrictEqual(Effect.runSync(effect), "a message");
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined; readonly batching?: boolean | "inherit" | undefined }
      | undefined
  ): Effect<A, E | E2, R | R2>
} = fiberRuntime.zipLeftOptions

/**
 * Sequentially run this effect with the specified effect, _returning_ the result
 * of the second effect (`that`) in the chain.
 *
 * `{ concurrent: true }` can be passed to the options to make it a concurrent execution
 * of both effects instead of sequential.
 *
 * @example
 *
 * import { Effect } from 'effect';
 *
 * const effect = Effect.succeed("a message").pipe(
 *   Effect.zipRight(Effect.succeed(42)),
 * )
 *
 * assert.deepStrictEqual(Effect.runSync(effect), 42);
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<A2, E2 | E, R2 | R>
} = fiberRuntime.zipRightOptions

/**
 * The `Effect.zipWith` function operates similarly to {@link zip} by combining
 * two effects. However, instead of returning a tuple, it allows you to apply a
 * function to the results of the combined effects, transforming them into a
 * single value
 *
 * @example
 * import { Effect } from "effect"
 *
 * const task1 = Effect.succeed(1).pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Effect.log("task1 done"))
 * )
 * const task2 = Effect.succeed("hello").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Effect.log("task2 done"))
 * )
 *
 * const task3 = Effect.zipWith(
 *   task1,
 *   task2,
 *   (number, string) => number + string.length
 * )
 *
 * Effect.runPromise(task3).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#3 message="task1 done"
 * // timestamp=... level=INFO fiber=#2 message="task2 done"
 * // 6
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <A2, E2, R2, A, B>(
    that: Effect<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, B>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<B, E2 | E, R2 | R>
} = fiberRuntime.zipWithOptions

// -------------------------------------------------------------------------------------
// applicatives
// -------------------------------------------------------------------------------------
/**
 * @category combining
 * @since 2.0.0
 */
export const ap: {
  <A, E2, R2>(that: Effect<A, E2, R2>): <B, R, E>(self: Effect<(a: A) => B, E, R>) => Effect<B, E | E2, R | R2>
  <A, B, E, R, E2, R2>(self: Effect<(a: A) => B, E, R>, that: Effect<A, E2, R2>): Effect<B, E | E2, R | R2>
} = dual(
  2,
  <A, B, E, R, E2, R2>(self: Effect<(a: A) => B, E, R>, that: Effect<A, E2, R2>): Effect<B, E | E2, R | R2> =>
    zipWith(self, that, (f, a) => f(a))
)
// -------------------------------------------------------------------------------------
// requests & batching
// -------------------------------------------------------------------------------------

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const blocked: <A, E>(blockedRequests: RequestBlock, _continue: Effect<A, E>) => Blocked<A, E> = core.blocked

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const runRequestBlock: (blockedRequests: RequestBlock) => Effect<void> = core.runRequestBlock

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const step: <A, E, R>(self: Effect<A, E, R>) => Effect<Exit.Exit<A, E> | Blocked<A, E>, never, R> = core.step

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const request: {
  <A extends Request.Request<any, any>, Ds extends RequestResolver<A> | Effect<RequestResolver<A>, any, any>>(
    dataSource: Ds
  ): (
    self: A
  ) => Effect<
    Request.Request.Success<A>,
    Request.Request.Error<A>,
    [Ds] extends [Effect<any, any, any>] ? Effect.Context<Ds> : never
  >
  <
    Ds extends RequestResolver<A> | Effect<RequestResolver<A>, any, any>,
    A extends Request.Request<any, any>
  >(
    self: A,
    dataSource: Ds
  ): Effect<
    Request.Request.Success<A>,
    Request.Request.Error<A>,
    [Ds] extends [Effect<any, any, any>] ? Effect.Context<Ds> : never
  >
} = dual((args) => Request.isRequest(args[0]), query.fromRequest)

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const cacheRequestResult: <A extends Request.Request<any, any>>(
  request: A,
  result: Request.Request.Result<A>
) => Effect<void> = query.cacheRequest

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestBatching: {
  (requestBatching: boolean): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, requestBatching: boolean): Effect<A, E, R>
} = core.withRequestBatching

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestCaching: {
  (strategy: boolean): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, strategy: boolean): Effect<A, E, R>
} = query.withRequestCaching

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestCache: {
  (cache: Request.Cache): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, cache: Request.Cache): Effect<A, E, R>
} = query.withRequestCache

// -------------------------------------------------------------------------------------
// tracing
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category tracing
 */
export const tracer: Effect<Tracer.Tracer> = effect.tracer

/**
 * @since 2.0.0
 * @category tracing
 */
export const tracerWith: <A, E, R>(f: (tracer: Tracer.Tracer) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.tracerWith

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracer: {
  (value: Tracer.Tracer): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, value: Tracer.Tracer): Effect<A, E, R>
} = defaultServices.withTracer

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracerScoped: (value: Tracer.Tracer) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withTracerScoped

/**
 * Disable the tracer for the given Effect.
 *
 * @since 2.0.0
 * @category tracing
 * @example
 * import { Effect } from "effect"
 *
 * Effect.succeed(42).pipe(
 *   Effect.withSpan("my-span"),
 *   // the span will not be registered with the tracer
 *   Effect.withTracerEnabled(false)
 * )
 */
export const withTracerEnabled: {
  (enabled: boolean): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, enabled: boolean): Effect<A, E, R>
} = core.withTracerEnabled

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracerTiming: {
  (enabled: boolean): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, enabled: boolean): Effect<A, E, R>
} = core.withTracerTiming

/**
 * Adds an annotation to each span in this effect.
 *
 * @since 2.0.0
 * @category tracing
 */
export const annotateSpans: {
  (key: string, value: unknown): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, unknown>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: unknown): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, unknown>): Effect<A, E, R>
} = effect.annotateSpans

/**
 * Adds an annotation to the current span if available
 *
 * @since 2.0.0
 * @category tracing
 */
export const annotateCurrentSpan: {
  (key: string, value: unknown): Effect<void>
  (values: Record<string, unknown>): Effect<void>
} = effect.annotateCurrentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const currentSpan: Effect<Tracer.Span, Cause.NoSuchElementException> = effect.currentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const currentParentSpan: Effect<Tracer.AnySpan, Cause.NoSuchElementException> = effect.currentParentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const spanAnnotations: Effect<HashMap.HashMap<string, unknown>> = effect.spanAnnotations

/**
 * @since 2.0.0
 * @category tracing
 */
export const spanLinks: Effect<Chunk.Chunk<Tracer.SpanLink>> = effect.spanLinks

/**
 * For all spans in this effect, add a link with the provided span.
 *
 * @since 2.0.0
 * @category tracing
 */
export const linkSpans: {
  (
    span: Tracer.AnySpan,
    attributes?: Record<string, unknown>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    span: Tracer.AnySpan,
    attributes?: Record<string, unknown>
  ): Effect<A, E, R>
} = effect.linkSpans

/**
 * Create a new span for tracing.
 *
 * @since 2.0.0
 * @category tracing
 */
export const makeSpan: (
  name: string,
  options?: Tracer.SpanOptions
) => Effect<Tracer.Span> = effect.makeSpan

/**
 * Create a new span for tracing, and automatically close it when the Scope
 * finalizes.
 *
 * The span is not added to the current span stack, so no child spans will be
 * created for it.
 *
 * @since 2.0.0
 * @category tracing
 */
export const makeSpanScoped: (
  name: string,
  options?: Tracer.SpanOptions | undefined
) => Effect<Tracer.Span, never, Scope.Scope> = fiberRuntime.makeSpanScoped

/**
 * Create a new span for tracing, and automatically close it when the effect
 * completes.
 *
 * The span is not added to the current span stack, so no child spans will be
 * created for it.
 *
 * @since 2.0.0
 * @category tracing
 */
export const useSpan: {
  <A, E, R>(name: string, evaluate: (span: Tracer.Span) => Effect<A, E, R>): Effect<A, E, R>
  <A, E, R>(
    name: string,
    options: Tracer.SpanOptions,
    evaluate: (span: Tracer.Span) => Effect<A, E, R>
  ): Effect<A, E, R>
} = effect.useSpan

/**
 * Wraps the effect with a new span for tracing.
 *
 * @since 2.0.0
 * @category tracing
 */
export const withSpan: {
  (
    name: string,
    options?: Tracer.SpanOptions | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Tracer.ParentSpan>>
  <A, E, R>(
    self: Effect<A, E, R>,
    name: string,
    options?: Tracer.SpanOptions | undefined
  ): Effect<A, E, Exclude<R, Tracer.ParentSpan>>
} = effect.withSpan

/**
 * Wraps a function that returns an effect with a new span for tracing.
 *
 * @since 3.2.0
 * @category models
 */
export interface FunctionWithSpanOptions {
  readonly name: string
  readonly attributes?: Record<string, unknown> | undefined
  readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
  readonly parent?: Tracer.AnySpan | undefined
  readonly root?: boolean | undefined
  readonly context?: Context.Context<never> | undefined
  readonly kind?: Tracer.SpanKind | undefined
}

/**
 * Wraps a function that returns an effect with a new span for tracing.
 *
 * @since 3.2.0
 * @category tracing
 * @example
 * import { Effect } from "effect"
 *
 * const getTodo = Effect.functionWithSpan({
 *   body: (id: number) => Effect.succeed(`Got todo ${id}!`),
 *   options: (id) => ({
 *     name: `getTodo-${id}`,
 *     attributes: { id }
 *   })
 * })
 */
export const functionWithSpan: <Args extends Array<any>, Ret extends Effect<any, any, any>>(
  options: {
    readonly body: (...args: Args) => Ret
    readonly options: FunctionWithSpanOptions | ((...args: Args) => FunctionWithSpanOptions)
    readonly captureStackTrace?: boolean | undefined
  }
) => (...args: Args) => Unify.Unify<Ret> = effect.functionWithSpan

/**
 * Wraps the effect with a new span for tracing.
 *
 * The span is ended when the Scope is finalized.
 *
 * @since 2.0.0
 * @category tracing
 */
export const withSpanScoped: {
  (
    name: string,
    options?: Tracer.SpanOptions
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Tracer.ParentSpan> | Scope.Scope>
  <A, E, R>(
    self: Effect<A, E, R>,
    name: string,
    options?: Tracer.SpanOptions
  ): Effect<A, E, Exclude<R, Tracer.ParentSpan> | Scope.Scope>
} = fiberRuntime.withSpanScoped

/**
 * Adds the provided span to the current span stack.
 *
 * @since 2.0.0
 * @category tracing
 */
export const withParentSpan: {
  (span: Tracer.AnySpan): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Tracer.ParentSpan>>
  <A, E, R>(self: Effect<A, E, R>, span: Tracer.AnySpan): Effect<A, E, Exclude<R, Tracer.ParentSpan>>
} = effect.withParentSpan

// -------------------------------------------------------------------------------------
// optionality
// -------------------------------------------------------------------------------------

/**
 * Returns an effect that errors with `NoSuchElementException` if the value is
 * null or undefined, otherwise succeeds with the value.
 *
 * @since 2.0.0
 * @category optionality
 */
export const fromNullable: <A>(value: A) => Effect<NonNullable<A>, Cause.NoSuchElementException> = effect.fromNullable

/**
 * Wraps the success value of this effect with `Option.some`, and maps
 * `Cause.NoSuchElementException` to `Option.none`.
 *
 * @since 2.0.0
 * @category optionality
 */
export const optionFromOptional: <A, E, R>(
  self: Effect<A, E, R>
) => Effect<Option.Option<A>, Exclude<E, Cause.NoSuchElementException>, R> = effect.optionFromOptional

/**
 * @since 2.0.0
 * @category models
 */
export declare namespace Tag {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface ProhibitedType {
    _op?: "propety name _op is forbidden"
    _tag?: "propety name _tag is forbidden"
    of?: "propety name of is forbidden"
    context?: "propety name context is forbidden"
    key?: "propety name key is forbidden"
    stack?: "propety name stack is forbidden"
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type AllowedType = (Record<PropertyKey, any> & ProhibitedType) | string | number | symbol
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const Tag: <const Id extends string>(id: Id) => <
  Self,
  Type extends Tag.AllowedType
>() =>
  & Context.TagClass<Self, Id, Type>
  & (Type extends Record<PropertyKey, any> ? {
      [
        k in keyof Type as Type[k] extends ((...args: [...infer Args]) => infer Ret) ?
          ((...args: Readonly<Args>) => Ret) extends Type[k] ? k : never
          : k
      ]: Type[k] extends (...args: [...infer Args]) => Effect<infer A, infer E, infer R> ?
        (...args: Readonly<Args>) => Effect<A, E, Self | R>
        : Type[k] extends (...args: [...infer Args]) => infer A ? (...args: Readonly<Args>) => Effect<A, never, Self>
        : Type[k] extends Effect<infer A, infer E, infer R> ? Effect<A, E, Self | R>
        : Effect<Type[k], never, Self>
    } :
    {})
  & {
    use: <X>(
      body: (_: Type) => X
    ) => X extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Self> : Effect<X, never, Self>
  } = (id) => () => {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 2
    const creationError = new Error()
    Error.stackTraceLimit = limit
    function TagClass() {}
    Object.setPrototypeOf(TagClass, TagProto)
    TagClass.key = id
    Object.defineProperty(TagClass, "stack", {
      get() {
        return creationError.stack
      }
    })
    const cache = new Map()
    const done = new Proxy(TagClass, {
      get(_target: any, prop: any, _receiver) {
        if (prop === "use") {
          // @ts-expect-error
          return (body) => core.andThen(TagClass, body)
        }
        if (prop in TagClass) {
          // @ts-expect-error
          return TagClass[prop]
        }
        if (cache.has(prop)) {
          return cache.get(prop)
        }
        const fn = (...args: Array<any>) =>
          // @ts-expect-error
          core.andThen(TagClass, (s: any) => {
            if (typeof s[prop] === "function") {
              // @ts-expect-error
              cache.set(prop, (...args: Array<any>) => core.andThen(TagClass, (s: any) => s[prop](...args)))
              return s[prop](...args)
            }
            // @ts-expect-error
            cache.set(prop, core.andThen(TagClass, (s) => s[prop]))
            return s[prop]
          })
        // @ts-expect-error
        const cn = core.andThen(TagClass, (s) => s[prop])
        Object.assign(fn, cn)
        Object.setPrototypeOf(fn, Object.getPrototypeOf(cn))
        cache.set(prop, fn)
        return fn
      }
    })
    return done
  }
