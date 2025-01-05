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
import * as internalCause from "./internal/cause.js"
import * as console_ from "./internal/console.js"
import { TagProto } from "./internal/context.js"
import * as effect from "./internal/core-effect.js"
import * as core from "./internal/core.js"
import * as defaultServices from "./internal/defaultServices.js"
import * as circular from "./internal/effect/circular.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as layer from "./internal/layer.js"
import * as query from "./internal/query.js"
import * as runtime_ from "./internal/runtime.js"
import * as schedule_ from "./internal/schedule.js"
import * as internalTracer from "./internal/tracer.js"
import type * as Layer from "./Layer.js"
import type { LogLevel } from "./LogLevel.js"
import type * as ManagedRuntime from "./ManagedRuntime.js"
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
import type { Concurrency, Contravariant, Covariant, NoExcessProperties, NoInfer, NotFunction } from "./Types.js"
import type * as Unify from "./Unify.js"
import { isGeneratorFunction, type YieldWrap } from "./Utils.js"

/**
 * @since 2.0.0
 * @category Symbols
 */
export const EffectTypeId: unique symbol = core.EffectTypeId

/**
 * @since 2.0.0
 * @category Symbols
 */
export type EffectTypeId = typeof EffectTypeId

/**
 * The `Effect` interface defines a value that describes a workflow or job,
 * which can succeed or fail.
 *
 * **Details**
 *
 * The `Effect` interface represents a computation that can model a workflow
 * involving various types of operations, such as synchronous, asynchronous,
 * concurrent, and parallel interactions. It operates within a context of type
 * `R`, and the result can either be a success with a value of type `A` or a
 * failure with an error of type `E`. The `Effect` is designed to handle complex
 * interactions with external resources, offering advanced features such as
 * fiber-based concurrency, scheduling, interruption handling, and scalability.
 * This makes it suitable for tasks that require fine-grained control over
 * concurrency and error management.
 *
 * To execute an `Effect` value, you need a `Runtime`, which provides the
 * environment necessary to run and manage the computation.
 *
 * @since 2.0.0
 * @category Models
 */
export interface Effect<out A, out E = never, out R = never> extends Effect.Variance<A, E, R>, Pipeable {
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: EffectUnify<this>
  readonly [Unify.ignoreSymbol]?: EffectUnifyIgnore
  [Symbol.iterator](): EffectGenerator<Effect<A, E, R>>
}

/**
 * @since 3.0.0
 * @category Models
 */
export interface EffectGenerator<T extends Effect<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<YieldWrap<T>, Effect.Success<T>>
}

/**
 * @since 2.0.0
 * @category Models
 */
export interface EffectUnify<A extends { [Unify.typeSymbol]?: any }>
  extends Either.EitherUnify<A>, Option.OptionUnify<A>, Context.TagUnify<A>
{
  Effect?: () => A[Unify.typeSymbol] extends Effect<infer A0, infer E0, infer R0> | infer _ ? Effect<A0, E0, R0> : never
}

/**
 * @category Models
 * @since 2.0.0
 */
export interface EffectUnifyIgnore {
  Tag?: true
  Option?: true
  Either?: true
}

/**
 * @category Type lambdas
 * @since 2.0.0
 */
export interface EffectTypeLambda extends TypeLambda {
  readonly type: Effect<this["Target"], this["Out1"], this["Out2"]>
}

/**
 * @since 2.0.0
 * @category Models
 */
export interface Blocked<out A, out E> extends Effect<A, E> {
  readonly _op: "Blocked"
  readonly effect_instruction_i0: RequestBlock
  readonly effect_instruction_i1: Effect<A, E>
}

/**
 * @since 2.0.0
 * @category Models
 */
declare module "./Context.js" {
  interface Tag<Id, Value> extends Effect<Value, never, Id> {
    [Symbol.iterator](): EffectGenerator<Tag<Id, Value>>
  }
  interface Reference<Id, Value> extends Effect<Value> {
    [Symbol.iterator](): EffectGenerator<Reference<Id, Value>>
  }
  interface TagUnifyIgnore {
    Effect?: true
    Either?: true
    Option?: true
  }
}

/**
 * @since 2.0.0
 * @category Models
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
 * @category Models
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
   * @category Models
   */
  export interface Variance<out A, out E, out R> {
    readonly [EffectTypeId]: VarianceStruct<A, E, R>
  }
  /**
   * @since 2.0.0
   * @category Models
   */
  export interface VarianceStruct<out A, out E, out R> {
    readonly _V: string
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
    readonly _R: Covariant<R>
  }
  /**
   * @since 2.0.0
   * @category Effect Type Extractors
   */
  export type Context<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _R : never
  /**
   * @since 2.0.0
   * @category Effect Type Extractors
   */
  export type Error<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _E : never
  /**
   * @since 2.0.0
   * @category Effect Type Extractors
   */
  export type Success<T extends Effect<any, any, any>> = [T] extends [Effect<infer _A, infer _E, infer _R>] ? _A : never
}

/**
 * Checks if a given value is an `Effect` value.
 *
 * **When to Use**
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Effect` value. For example, you could use
 * `Effect.isEffect` to check the type of a value before using it as an argument
 * to a function that expects an `Effect` value.
 *
 * @since 2.0.0
 * @category Guards
 */
export const isEffect: (u: unknown) => u is Effect<unknown, unknown, unknown> = core.isEffect

/**
 * Returns an effect that caches its result for a specified `Duration`,
 * known as "timeToLive" (TTL).
 *
 * **Details**
 *
 * This function is used to cache the result of an effect for a specified amount
 * of time. This means that the first time the effect is evaluated, its result
 * is computed and stored.
 *
 * If the effect is evaluated again within the specified `timeToLive`, the
 * cached result will be used, avoiding recomputation.
 *
 * After the specified duration has passed, the cache expires, and the effect
 * will be recomputed upon the next evaluation.
 *
 * **When to Use**
 *
 * Use this function when you have an effect that involves costly operations or
 * computations, and you want to avoid repeating them within a short time frame.
 *
 * It's ideal for scenarios where the result of an effect doesn't change
 * frequently and can be reused for a specified duration.
 *
 * By caching the result, you can improve efficiency and reduce unnecessary
 * computations, especially in performance-critical applications.
 *
 * @see {@link cached} for a similar function that caches the result
 * indefinitely.
 * @see {@link cachedInvalidateWithTTL} for a similar function that includes an
 * additional effect for manually invalidating the cached value.
 *
 * @example
 * ```ts
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
 * // Effect.runFork(program)
 * // Output:
 * // expensive task...
 * // result 1
 * // result 1
 * // expensive task...
 * // result 2
 * ```
 *
 * @since 2.0.0
 * @category Caching
 */
export const cachedWithTTL: {
  (timeToLive: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<A, E>, never, R>
  <A, E, R>(self: Effect<A, E, R>, timeToLive: Duration.DurationInput): Effect<Effect<A, E>, never, R>
} = circular.cached

/**
 * Caches an effect's result for a specified duration and allows manual
 * invalidation before expiration.
 *
 * **Details**
 *
 * This function behaves similarly to {@link cachedWithTTL} by caching the
 * result of an effect for a specified period of time. However, it introduces an
 * additional feature: it provides an effect that allows you to manually
 * invalidate the cached result before it naturally expires.
 *
 * This gives you more control over the cache, allowing you to refresh the
 * result when needed, even if the original cache has not yet expired.
 *
 * Once the cache is invalidated, the next time the effect is evaluated, the
 * result will be recomputed, and the cache will be refreshed.
 *
 * **When to Use**
 *
 * Use this function when you have an effect whose result needs to be cached for
 * a certain period, but you also want the option to refresh the cache manually
 * before the expiration time.
 *
 * This is useful when you need to ensure that the cached data remains valid for
 * a certain period but still want to invalidate it if the underlying data
 * changes or if you want to force a recomputation.
 *
 * @see {@link cached} for a similar function that caches the result
 * indefinitely.
 * @see {@link cachedWithTTL} for a similar function that caches the result for
 * a specified duration but does not include an effect for manual invalidation.
 *
 * @example
 * ```ts
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
 * // Effect.runFork(program)
 * // Output:
 * // expensive task...
 * // result 1
 * // result 1
 * // expensive task...
 * // result 2
 * ```
 *
 * @since 2.0.0
 * @category Caching
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
 * Returns an effect that lazily computes a result and caches it for subsequent
 * evaluations.
 *
 * **Details**
 *
 * This function wraps an effect and ensures that its result is computed only
 * once. Once the result is computed, it is cached, meaning that subsequent
 * evaluations of the same effect will return the cached result without
 * re-executing the logic.
 *
 * **When to Use**
 *
 * Use this function when you have an expensive or time-consuming operation that
 * you want to avoid repeating. The first evaluation will compute the result,
 * and all following evaluations will immediately return the cached value,
 * improving performance and reducing unnecessary work.
 *
 * @see {@link cachedWithTTL} for a similar function that includes a
 * time-to-live duration for the cached value.
 * @see {@link cachedInvalidateWithTTL} for a similar function that includes an
 * additional effect for manually invalidating the cached value.
 *
 * @example
 * ```ts
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
 * // Effect.runFork(program)
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
 * ```
 *
 * @since 2.0.0
 * @category Caching
 */
export const cached: <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<A, E, R>> = effect.memoize

/**
 * Returns a memoized version of a function with effects, reusing results for
 * the same inputs.
 *
 * **Details**
 *
 * This function creates a memoized version of a given function that performs an
 * effect. Memoization ensures that once a result is computed for a specific
 * input, it is stored and reused for subsequent calls with the same input,
 * reducing the need to recompute the result.
 *
 * The function can optionally take an `Equivalence` parameter to
 * determine how inputs are compared for caching purposes.
 *
 * **When to Use**
 *
 * Use this function when you have a function that performs an effect and you
 * want to avoid recomputing the result for the same input multiple times.
 *
 * It's ideal for functions that produce deterministic results based on their
 * inputs, and you want to improve performance by caching the output.
 *
 * This is particularly useful in scenarios where the function involves
 * expensive calculations or operations that should be avoided after the first
 * execution with the same parameters.
 *
 * @example
 * ```ts
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
 * // Effect.runFork(program)
 * // Example Output:
 * // non-memoized version:
 * // 2
 * // 8
 * // memoized version:
 * // 5
 * // 5
 * ```
 *
 * @since 2.0.0
 * @category Caching
 */
export const cachedFunction: <A, B, E, R>(
  f: (a: A) => Effect<B, E, R>,
  eq?: Equivalence<A>
) => Effect<(a: A) => Effect<B, E, R>> = circular.cachedFunction

/**
 * Returns an effect that executes only once, regardless of how many times it's
 * called.
 *
 * **Details**
 *
 * This function ensures that a specific effect is executed only a single time,
 * no matter how many times it is invoked. The result of the effect will be
 * cached, and subsequent calls to the effect will immediately return the cached
 * result without re-executing the original logic.
 *
 * **When to Use**
 *
 * Use this function when you need to perform a task only once, regardless of
 * how many times the effect is triggered. It's particularly useful when you
 * have initialization tasks, logging, or other one-time actions that should not
 * be repeated. This can help optimize performance and avoid redundant actions.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const task1 = Console.log("task1")
 *   yield* Effect.repeatN(task1, 2)
 *   const task2 = yield* Effect.once(Console.log("task2"))
 *   yield* Effect.repeatN(task2, 2)
 * })
 *
 * // Effect.runFork(program)
 * // Output:
 * // task1
 * // task1
 * // task1
 * // task2
 * ```
 *
 * @since 2.0.0
 * @category Caching
 */
export const once: <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<void, E, R>> = effect.once

/**
 * Combines multiple effects into one, returning results based on the input
 * structure.
 *
 * **Details**
 *
 * Use this function when you need to run multiple effects and combine their
 * results into a single output. It supports tuples, iterables, structs, and
 * records, making it flexible for different input types.
 *
 * For instance, if the input is a tuple:
 *
 * ```ts
 * //         ┌─── a tuple of effects
 * //         ▼
 * Effect.all([effect1, effect2, ...])
 * ```
 *
 * the effects are executed sequentially, and the result is a new effect
 * containing the results as a tuple. The results in the tuple match the order
 * of the effects passed to `Effect.all`.
 *
 * **Concurrency**
 *
 * You can control the execution order (e.g., sequential vs. concurrent) using
 * the `concurrency` option.
 *
 * **Short-Circuiting Behavior**
 *
 * This function stops execution on the first error it encounters, this is
 * called "short-circuiting". If any effect in the collection fails, the
 * remaining effects will not run, and the error will be propagated. To change
 * this behavior, you can use the `mode` option, which allows all effects to run
 * and collect results as `Either` or `Option`.
 *
 * **The `mode` option**
 *
 * The `{ mode: "either" }` option changes the behavior of `Effect.all` to
 * ensure all effects run, even if some fail. Instead of stopping on the first
 * failure, this mode collects both successes and failures, returning an array
 * of `Either` instances where each result is either a `Right` (success) or a
 * `Left` (failure).
 *
 * Similarly, the `{ mode: "validate" }` option uses `Option` to indicate
 * success or failure. Each effect returns `None` for success and `Some` with
 * the error for failure.
 *
 * @see {@link forEach} for iterating over elements and applying an effect.
 * @see {@link allWith} for a data-last version of this function.
 *
 * @example
 * ```ts
 * // Title: Combining Effects in Tuples
 * import { Effect, Console } from "effect"
 *
 * const tupleOfEffects = [
 *   Effect.succeed(42).pipe(Effect.tap(Console.log)),
 *   Effect.succeed("Hello").pipe(Effect.tap(Console.log))
 * ] as const
 *
 * //      ┌─── Effect<[number, string], never, never>
 * //      ▼
 * const resultsAsTuple = Effect.all(tupleOfEffects)
 *
 * // Effect.runPromise(resultsAsTuple).then(console.log)
 * // Output:
 * // 42
 * // Hello
 * // [ 42, 'Hello' ]
 * ```
 *
 * @example
 * // Title: Combining Effects in Iterables
 * import { Effect, Console } from "effect"
 *
 * const iterableOfEffects: Iterable<Effect.Effect<number>> = [1, 2, 3].map(
 *   (n) => Effect.succeed(n).pipe(Effect.tap(Console.log))
 * )
 *
 * //      ┌─── Effect<number[], never, never>
 * //      ▼
 * const resultsAsArray = Effect.all(iterableOfEffects)
 *
 * // Effect.runPromise(resultsAsArray).then(console.log)
 * // Output:
 * // 1
 * // 2
 * // 3
 * // [ 1, 2, 3 ]
 *
 * @example
 * // Title: Combining Effects in Structs
 * import { Effect, Console } from "effect"
 *
 * const structOfEffects = {
 *   a: Effect.succeed(42).pipe(Effect.tap(Console.log)),
 *   b: Effect.succeed("Hello").pipe(Effect.tap(Console.log))
 * }
 *
 * //      ┌─── Effect<{ a: number; b: string; }, never, never>
 * //      ▼
 * const resultsAsStruct = Effect.all(structOfEffects)
 *
 * // Effect.runPromise(resultsAsStruct).then(console.log)
 * // Output:
 * // 42
 * // Hello
 * // { a: 42, b: 'Hello' }
 *
 * @example
 * // Title: Combining Effects in Records
 * import { Effect, Console } from "effect"
 *
 * const recordOfEffects: Record<string, Effect.Effect<number>> = {
 *   key1: Effect.succeed(1).pipe(Effect.tap(Console.log)),
 *   key2: Effect.succeed(2).pipe(Effect.tap(Console.log))
 * }
 *
 * //      ┌─── Effect<{ [x: string]: number; }, never, never>
 * //      ▼
 * const resultsAsRecord = Effect.all(recordOfEffects)
 *
 * // Effect.runPromise(resultsAsRecord).then(console.log)
 * // Output:
 * // 1
 * // 2
 * // { key1: 1, key2: 2 }
 *
 * @example
 * // Title: Short-Circuiting Behavior
 * import { Effect, Console } from "effect"
 *
 * const program = Effect.all([
 *   Effect.succeed("Task1").pipe(Effect.tap(Console.log)),
 *   Effect.fail("Task2: Oh no!").pipe(Effect.tap(Console.log)),
 *   // Won't execute due to earlier failure
 *   Effect.succeed("Task3").pipe(Effect.tap(Console.log))
 * ])
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Task1
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'Task2: Oh no!' }
 * // }
 *
 * @example
 * // Title: Collecting Results with `mode: "either"`
 * import { Effect, Console } from "effect"
 *
 * const effects = [
 *   Effect.succeed("Task1").pipe(Effect.tap(Console.log)),
 *   Effect.fail("Task2: Oh no!").pipe(Effect.tap(Console.log)),
 *   Effect.succeed("Task3").pipe(Effect.tap(Console.log))
 * ]
 *
 * const program = Effect.all(effects, { mode: "either" })
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Task1
 * // Task3
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Success',
 * //   value: [
 * //     { _id: 'Either', _tag: 'Right', right: 'Task1' },
 * //     { _id: 'Either', _tag: 'Left', left: 'Task2: Oh no!' },
 * //     { _id: 'Either', _tag: 'Right', right: 'Task3' }
 * //   ]
 * // }
 *
 * @example
 * //Example: Collecting Results with `mode: "validate"`
 * import { Effect, Console } from "effect"
 *
 * const effects = [
 *   Effect.succeed("Task1").pipe(Effect.tap(Console.log)),
 *   Effect.fail("Task2: Oh no!").pipe(Effect.tap(Console.log)),
 *   Effect.succeed("Task3").pipe(Effect.tap(Console.log))
 * ]
 *
 * const program = Effect.all(effects, { mode: "validate" })
 *
 * // Effect.runPromiseExit(program).then((result) => console.log("%o", result))
 * // Output:
 * // Task1
 * // Task3
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: [
 * //       { _id: 'Option', _tag: 'None' },
 * //       { _id: 'Option', _tag: 'Some', value: 'Task2: Oh no!' },
 * //       { _id: 'Option', _tag: 'None' }
 * //     ]
 * //   }
 * // }
 *
 * @since 2.0.0
 * @category Collecting
 */
export const all: <
  const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
    readonly concurrentFinalizers?: boolean | undefined
  }
>(arg: Arg, options?: O) => All.Return<Arg, O> = fiberRuntime.all

/**
 * A data-last version of {@link all}, designed for use in pipelines.
 *
 * **When to Use**
 *
 * This function enables you to combine multiple effects and customize execution
 * options such as concurrency levels. This version is useful in functional
 * pipelines where you first define your data and then apply operations to it.
 *
 * @example
 * ```ts
 * import { Effect, pipe } from "effect"
 *
 * const task1 = Effect.succeed(1).pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Effect.log("task1 done"))
 * )
 *
 * const task2 = Effect.succeed("hello").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Effect.log("task2 done"))
 * )
 *
 * const program = pipe(
 *   [task1, task2],
 *   // Run both effects concurrently using the concurrent option
 *   Effect.allWith({ concurrency: 2 })
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#3 message="task2 done"
 * // timestamp=... level=INFO fiber=#2 message="task1 done"
 * // [ 1, 'hello' ]
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const allWith: <
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "validate" | "either" | undefined
    readonly concurrentFinalizers?: boolean | undefined
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
      readonly concurrentFinalizers?: boolean | undefined
    }
  > = [Arg] extends [ReadonlyArray<EffectAny>] ? ReturnTuple<Arg, IsDiscard<O>, ExtractMode<O>>
    : [Arg] extends [Iterable<EffectAny>] ? ReturnIterable<Arg, IsDiscard<O>, ExtractMode<O>>
    : [Arg] extends [Record<string, EffectAny>] ? ReturnObject<Arg, IsDiscard<O>, ExtractMode<O>>
    : never
}

/**
 * Evaluates and runs each effect in the iterable, collecting only the
 * successful results while discarding failures.
 *
 * **Details**
 *
 * This function function processes an iterable of effects and runs each one. If
 * an effect is successful, its result is collected; if it fails, the result is
 * discarded. This ensures that only successful outcomes are kept.
 *
 * **Options**
 *
 * The function also allows you to customize how the effects are handled by
 * specifying options such as concurrency, batching, and how finalizers behave.
 * These options provide flexibility in running the effects concurrently or
 * adjusting other execution details.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const tasks = [
 *   Effect.succeed(1),
 *   Effect.fail("Error 1"),
 *   Effect.succeed(2),
 *   Effect.fail("Error 2")
 * ]
 *
 * const program = Effect.gen(function*() {
 *   const successfulResults = yield* Effect.allSuccesses(tasks)
 *   console.log(successfulResults)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [1, 2]
 *
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const allSuccesses: <X extends Effect<any, any, any>>(
  elements: Iterable<X>,
  options?:
    | {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
    | undefined
) => Effect<Array<Effect.Success<X>>, never, Effect.Context<X>> = fiberRuntime.allSuccesses

/**
 * Drops elements until the effectful predicate returns `true`.
 *
 * **Details**
 *
 * This function processes a collection of elements and uses an effectful
 * predicate to determine when to stop dropping elements. It drops elements from
 * the beginning of the collection until the predicate returns `true`.
 *
 * The predicate is a function that takes an element and its index in the
 * collection and returns an effect that evaluates to a boolean.
 *
 * Once the predicate returns `true`, the remaining elements of the collection
 * are returned.
 *
 * **Note**: The first element for which the predicate returns `true` is also
 * dropped.
 *
 * **When to Use**
 *
 * This function allows you to conditionally skip over a part of the collection
 * based on some criteria defined in the predicate.
 *
 * @see {@link dropWhile} for a similar function that drops elements while the
 * predicate returns `true`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5, 6]
 * const predicate = (n: number, i: number) => Effect.succeed(n > 3)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.dropUntil(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [5, 6]
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const dropUntil: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<boolean, E, R>): Effect<Array<A>, E, R>
} = effect.dropUntil

/**
 * Drops elements as long as the predicate returns `true`.
 *
 * **Details**
 *
 * This function processes a collection of elements and uses a predicate to
 * decide whether to drop an element.
 *
 * The predicate is a function that takes an element and its index, and it
 * returns an effect that evaluates to a boolean.
 *
 * As long as the predicate returns `true`, elements will continue to be dropped
 * from the collection.
 *
 * Once the predicate returns `false`, the remaining elements are kept.
 *
 * **When to Use**
 *
 * This function allows you to discard elements from the start of a collection
 * based on a condition, and only keep the rest when the condition no longer
 * holds.
 *
 * @see {@link dropUntil} for a similar function that drops elements until the
 * predicate returns `true`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5, 6]
 * const predicate = (n: number, i: number) => Effect.succeed(n <= 3)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.dropWhile(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [4, 5, 6]
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const dropWhile: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<boolean, E, R>): Effect<Array<A>, E, R>
} = effect.dropWhile

/**
 * Takes elements from a collection until the effectful predicate returns
 * `true`.
 *
 * **Details**
 *
 * This function processes a collection of elements and uses an effectful
 * predicate to decide when to stop taking elements. The elements are taken from
 * the beginning of the collection until the predicate returns `true`.
 *
 * The predicate is a function that takes an element and its index in the
 * collection, and returns an effect that resolves to a boolean.
 *
 * Once the predicate returns `true`, the remaining elements of the collection
 * are discarded, and the function stops taking more elements.
 *
 * **Note**: The first element for which the predicate returns `true` is also
 * included in the result.
 *
 * **When to Use**
 *
 * Use this function when you want to conditionally take elements from a
 * collection based on a dynamic condition. For example, you may want to collect
 * numbers from a list until a certain threshold is reached, or gather items
 * until a specific condition is met.
 *
 * @see {@link takeWhile} for a similar function that takes elements while the
 * predicate returns `true`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5, 6]
 * const predicate = (n: number, i: number) => Effect.succeed(n > 3)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.takeUntil(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [ 1, 2, 3, 4 ]
 * ```
 *
 * @since 2.0.0
 * @category Collecting
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
 * Takes elements as long as the predicate returns `true`.
 *
 * **Details**
 *
 * This function processes a collection of elements and uses a predicate to
 * decide whether to take an element.
 *
 * The predicate is a function that takes an element and its index, and it
 * returns an effect that evaluates to a boolean.
 *
 * As long as the predicate returns `true`, elements will continue to be taken
 * from the collection.
 *
 * Once the predicate returns `false`, the remaining elements are discarded.
 *
 * @see {@link takeUntil} for a similar function that takes elements until the predicate returns `true`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5, 6]
 * const predicate = (n: number, i: number) => Effect.succeed(n <= 3)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.takeWhile(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 * @category Collecting
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
 * Determines whether all elements of the iterable satisfy the effectful
 * predicate.
 *
 * **Details**
 *
 * This function checks whether every element in a given collection (an
 * iterable) satisfies a condition defined by an effectful predicate.
 *
 * The predicate is a function that takes an element and its index, and it
 * returns an effect that evaluates to a boolean.
 *
 * The function will process each element and return `true` if all elements
 * satisfy the predicate; otherwise, it returns `false`.
 *
 * **When to Use**
 *
 * This function is useful when you need to verify that all items in a
 * collection meet certain criteria, even when the evaluation of each item
 * involves effects, such as asynchronous checks or complex computations.
 *
 * @see {@link exists} for a similar function that returns a boolean indicating
 * whether **any** element satisfies the predicate.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [2, 4, 6, 8]
 * const predicate = (n: number, i: number) => Effect.succeed(n % 2 === 0)
 *
 * const program = Effect.gen(function*() {
 *   const allEven = yield* Effect.every(numbers, predicate)
 *   console.log(allEven)
 * })
 *
 * // Effect.runFork(program)
 * // Output: true
 * ```
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const every: {
  <A, E, R>(predicate: (a: A, i: number) => Effect<boolean, E, R>): (elements: Iterable<A>) => Effect<boolean, E, R>
  <A, E, R>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<boolean, E, R>): Effect<boolean, E, R>
} = effect.every

/**
 * Determines whether any element of the iterable satisfies the effectual
 * predicate.
 *
 * **Details**
 *
 * This function checks whether any element in a given collection (an iterable)
 * satisfies a condition defined by an effectful predicate.
 *
 * The predicate is a function that takes an element and its index, and it
 * returns an effect that evaluates to a boolean.
 *
 * The function will process each element, and if any element satisfies the
 * predicate (returns `true`), the function will immediately return `true`.
 *
 * If none of the elements satisfy the condition, it will return `false`.
 *
 * **When to Use**
 *
 * This function allows you to quickly check for a condition in a collection
 * without having to manually iterate over it.
 *
 * @see {@link every} for a similar function that checks if **all** elements
 * satisfy the predicate.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4]
 * const predicate = (n: number, i: number) => Effect.succeed(n > 2)
 *
 * const program = Effect.gen(function*() {
 *   const hasLargeNumber = yield* Effect.exists(numbers, predicate)
 *   console.log(hasLargeNumber)
 * })
 *
 * // Effect.runFork(program)
 * // Output: true
 * ```
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const exists: {
  <A, E, R>(
    predicate: (a: A, i: number) => Effect<boolean, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): (elements: Iterable<A>) => Effect<boolean, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    predicate: (a: A, i: number) => Effect<boolean, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<boolean, E, R>
} = fiberRuntime.exists

/**
 * Filters an iterable using the specified effectful predicate.
 *
 * **Details**
 *
 * This function filters a collection (an iterable) by applying an effectful
 * predicate.
 *
 * The predicate is a function that takes an element and its index, and it
 * returns an effect that evaluates to a boolean.
 *
 * The function processes each element in the collection and keeps only those
 * that satisfy the condition defined by the predicate.
 *
 * **Options**
 *
 * You can also adjust the behavior with options such as concurrency, batching,
 * or whether to negate the condition.
 *
 * **When to Use**
 *
 * This function allows you to selectively keep or remove elements based on a
 * condition that may involve asynchronous or side-effect-causing operations.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5]
 * const predicate = (n: number, i: number) => Effect.succeed(n % 2 === 0)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.filter(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: [2, 4]
 * ```
 *
 * @since 2.0.0
 * @category Filtering
 */
export const filter: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): Effect<Array<A>, E, R>
} = fiberRuntime.filter

/**
 * Filters and maps elements sequentially in one operation.
 *
 * This function processes each element one by one. It applies a function that
 * returns an `Option` to each element. If the function returns `Some`, the
 * element is kept; if it returns `None`, the element is removed. The operation
 * is done sequentially for each element.
 *
 * @example
 * ```ts
 * import { Console, Effect, Option } from "effect"
 *
 * const task = (n: number) =>
 *   Effect.succeed(n).pipe(
 *     Effect.delay(1000 - (n * 100)),
 *     Effect.tap(Console.log(`task${n} done`))
 *   )
 *
 * const program = Effect.filterMap(
 *   [task(1), task(2), task(3), task(4)],
 *   (n) => n % 2 === 0 ? Option.some(n) : Option.none()
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // task1 done
 * // task2 done
 * // task3 done
 * // task4 done
 * // [ 2, 4 ]
 * ```
 *
 * @since 2.0.0
 * @category Filtering
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
 * **Details**
 *
 * This function processes a collection of elements and applies an effectful
 * predicate to each element.
 *
 * The predicate is a function that takes an element and its index in the
 * collection, and it returns an effect that evaluates to a boolean.
 *
 * The function stops as soon as it finds the first element for which the
 * predicate returns `true` and returns that element wrapped in an `Option`.
 *
 * If no element satisfies the predicate, the result will be `None`.
 *
 * **When to Use**
 *
 * This function allows you to efficiently find an element that meets a specific
 * condition, even when the evaluation involves effects like asynchronous
 * operations or side effects.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [1, 2, 3, 4, 5]
 * const predicate = (n: number, i: number) => Effect.succeed(n > 3)
 *
 * const program = Effect.gen(function*() {
 *   const result = yield* Effect.findFirst(numbers, predicate)
 *   console.log(result)
 * })
 *
 * // Effect.runFork(program)
 * // Output: { _id: 'Option', _tag: 'Some', value: 4 }
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const findFirst: {
  <A, E, R>(
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): (elements: Iterable<A>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    predicate: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>
  ): Effect<Option.Option<A>, E, R>
} = effect.findFirst

/**
 * Executes an effectful operation for each element in an `Iterable`.
 *
 * **Details**
 *
 * This function applies a provided operation to each element in the iterable,
 * producing a new effect that returns an array of results.
 *
 * If any effect fails, the iteration stops immediately (short-circuiting), and
 * the error is propagated.
 *
 * **Concurrency**
 *
 * The `concurrency` option controls how many operations are performed
 * concurrently. By default, the operations are performed sequentially.
 *
 * **Discarding Results**
 *
 * If the `discard` option is set to `true`, the intermediate results are not
 * collected, and the final result of the operation is `void`.
 *
 * @see {@link all} for combining multiple effects into one.
 *
 * @example
 * ```ts
 * // Title: Applying Effects to Iterable Elements
 * import { Effect, Console } from "effect"
 *
 * const result = Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
 *   Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2))
 * )
 *
 * // Effect.runPromise(result).then(console.log)
 * // Output:
 * // Currently at index 0
 * // Currently at index 1
 * // Currently at index 2
 * // Currently at index 3
 * // Currently at index 4
 * // [ 2, 4, 6, 8, 10 ]
 * ```
 *
 * @example
 * // Title: Using discard to Ignore Results
 * import { Effect, Console } from "effect"
 *
 * // Apply effects but discard the results
 * const result = Effect.forEach(
 *   [1, 2, 3, 4, 5],
 *   (n, index) =>
 *     Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2)),
 *   { discard: true }
 * )
 *
 * // Effect.runPromise(result).then(console.log)
 * // Output:
 * // Currently at index 0
 * // Currently at index 1
 * // Currently at index 2
 * // Currently at index 3
 * // Currently at index 4
 * // undefined
 *
 * @since 2.0.0
 * @category Looping
 */
export const forEach: {
  <B, E, R, S extends Iterable<any>>(
    f: (a: RA.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
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
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): (self: Iterable<A>) => Effect<void, E, R>
  <B, E, R, S extends Iterable<any>>(
    self: S,
    f: (a: RA.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): Effect<RA.ReadonlyArray.With<S, B>, E, R>
  <A, B, E, R>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<void, E, R>
} = fiberRuntime.forEach as any

/**
 * Returns the first element of the iterable if the collection is non-empty, or
 * fails with the error `NoSuchElementException` if the collection is empty.
 *
 * **When to Use**
 *
 * This function is useful when you need to retrieve the first item from a
 * collection and want to handle the case where the collection might be empty
 * without causing an unhandled exception.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * // Simulate an async operation
 * const fetchNumbers = Effect.succeed([1, 2, 3]).pipe(Effect.delay("100 millis"))
 *
 * const program = Effect.gen(function*() {
 *   const firstElement = yield* Effect.head(fetchNumbers)
 *   console.log(firstElement)
 * })
 *
 * // Effect.runFork(program)
 * // Output: 1
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const head: <A, E, R>(self: Effect<Iterable<A>, E, R>) => Effect<A, Cause.NoSuchElementException | E, R> =
  effect.head

/**
 * Merges an `Iterable<Effect<A, E, R>>` to a single effect.
 *
 * **Details**
 *
 * This function takes an iterable of effects and combines them into a single
 * effect. It does this by iterating over each effect in the collection and
 * applying a function that accumulates results into a "zero" value, which
 * starts with an initial value and is updated with each effect's success.
 *
 * The provided function `f` is called for each element in the iterable,
 * allowing you to specify how to combine the results.
 *
 * **Options**
 *
 * The function also allows you to customize how the effects are handled by
 * specifying options such as concurrency, batching, and how finalizers behave.
 * These options provide flexibility in running the effects concurrently or
 * adjusting other execution details.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const numbers = [Effect.succeed(1), Effect.succeed(2), Effect.succeed(3)]
 * const add = (sum: number, value: number, i: number) => sum + value
 * const zero = 0
 *
 * const program = Effect.gen(function*() {
 *   const total = yield* Effect.mergeAll(numbers, zero, add)
 *   console.log(total)
 * })
 *
 * // Effect.runFork(program)
 * // Output: 6
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const mergeAll: {
  <Z, Eff extends Effect<any, any, any>>(
    zero: Z,
    f: (z: Z, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): (elements: Iterable<Eff>) => Effect<Z, Effect.Error<Eff>, Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>, Z>(
    elements: Iterable<Eff>,
    zero: Z,
    f: (z: Z, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<Z, Effect.Error<Eff>, Effect.Context<Eff>>
} = fiberRuntime.mergeAll

/**
 * Processes an iterable and applies an effectful function to each element,
 * categorizing the results into successes and failures.
 *
 * **Details**
 *
 * This function processes each element in the provided iterable by applying an
 * effectful function to it. The results are then categorized into two separate
 * lists: one for failures and another for successes. This separation allows you
 * to handle the two categories differently. Failures are collected in a list
 * without interrupting the processing of the remaining elements, so the
 * operation continues even if some elements fail. This is particularly useful
 * when you need to handle both successful and failed results separately,
 * without stopping the entire process on encountering a failure.
 *
 * **When to Use**
 *
 * Use this function when you want to process a collection of items and handle
 * errors or failures without interrupting the processing of other items. It's
 * useful when you need to distinguish between successful and failed results and
 * process them separately, for example, when logging errors while continuing to
 * work with valid data. The function ensures that failures are captured, while
 * successes are processed normally.
 *
 * @see {@link validateAll} for a function that either collects all failures or all successes.
 * @see {@link validateFirst} for a function that stops at the first success.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<[string[], number[]], never, never>
 * //      ▼
 * const program = Effect.partition([0, 1, 2, 3, 4], (n) => {
 *   if (n % 2 === 0) {
 *     return Effect.succeed(n)
 *   } else {
 *     return Effect.fail(`${n} is not even`)
 *   }
 * })
 *
 * // Effect.runPromise(program).then(console.log, console.error)
 * // Output:
 * // [ [ '1 is not even', '3 is not even' ], [ 0, 2, 4 ] ]
 * ```
 *
 * @since 2.0.0
 * @category Error Accumulation
 */
export const partition: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): (elements: Iterable<A>) => Effect<[excluded: Array<E>, satisfying: Array<B>], never, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<[excluded: Array<E>, satisfying: Array<B>], never, R>
} = fiberRuntime.partition

/**
 * Reduces an `Iterable<A>` using an effectual function `f`, working
 * sequentially from left to right.
 *
 * **Details**
 *
 * This function takes an iterable and applies a function `f` to each element in
 * the iterable. The function works sequentially, starting with an initial value
 * `zero` and then combining it with each element in the collection. The
 * provided function `f` is called for each element in the iterable, allowing
 * you to accumulate a result based on the current value and the element being
 * processed.
 *
 * **When to Use**
 *
 * The function is often used for operations like summing a collection of
 * numbers or combining results from multiple tasks. It ensures that operations
 * are performed one after the other, maintaining the order of the elements.
 *
 * @see {@link reduceWhile} for a similar function that stops the process based on a predicate.
 * @see {@link reduceRight} for a similar function that works from right to left.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const processOrder = (id: number) =>
 *   Effect.succeed({ id, price: 100 * id })
 *     .pipe(Effect.tap(() => Console.log(`Order ${id} processed`)), Effect.delay(500 - (id * 100)))
 *
 * const program = Effect.reduce(
 *   [1, 2, 3, 4],
 *   0,
 *   (acc, id, i) =>
 *     processOrder(id)
 *       .pipe(Effect.map((order) => acc + order.price))
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // Order 1 processed
 * // Order 2 processed
 * // Order 3 processed
 * // Order 4 processed
 * // 1000
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const reduce: {
  <Z, A, E, R>(zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, E, R>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): Effect<Z, E, R>
} = effect.reduce

/**
 * Reduces an `Iterable<A>` using an effectual function `body`, working
 * sequentially from left to right, stopping the process early when the
 * predicate `while` is not satisfied.
 *
 * **Details**
 *
 * This function processes a collection of elements, applying a function `body`
 * to reduce them to a single value, starting from the first element. It checks
 * the value of the accumulator against a predicate (`while`). If at any point
 * the predicate returns `false`, the reduction stops, and the accumulated
 * result is returned.
 *
 * **When to Use**
 *
 * Use this function when you need to reduce a collection of elements, but only
 * continue the process as long as a certain condition holds true. For example,
 * if you want to sum values in a list but stop as soon as the sum exceeds a
 * certain threshold, you can use this function.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const processOrder = (id: number) =>
 *   Effect.succeed({ id, price: 100 * id })
 *     .pipe(Effect.tap(() => Console.log(`Order ${id} processed`)), Effect.delay(500 - (id * 100)))
 *
 * const program = Effect.reduceWhile(
 *   [1, 2, 3, 4],
 *   0,
 *   {
 *     body: (acc, id, i) =>
 *       processOrder(id)
 *         .pipe(Effect.map((order) => acc + order.price)),
 *     while: (acc) => acc < 500
 *   }
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // Order 1 processed
 * // Order 2 processed
 * // Order 3 processed
 * // 600
 * ```
 *
 * @since 2.0.0
 * @category Collecting
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
 * Reduces an `Iterable<A>` using an effectual function `f`, working
 * sequentially from right to left.
 *
 * **Details**
 *
 * This function takes an iterable and applies a function `f` to each element in
 * the iterable. The function works sequentially, starting with an initial value
 * `zero` and then combining it with each element in the collection. The
 * provided function `f` is called for each element in the iterable, allowing
 * you to accumulate a result based on the current value and the element being
 * processed.
 *
 * **When to Use**
 *
 * The function is often used for operations like summing a collection of
 * numbers or combining results from multiple tasks. It ensures that operations
 * are performed one after the other, maintaining the order of the elements.
 *
 * @see {@link reduce} for a similar function that works from left to right.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const processOrder = (id: number) =>
 *   Effect.succeed({ id, price: 100 * id })
 *     .pipe(Effect.tap(() => Console.log(`Order ${id} processed`)), Effect.delay(500 - (id * 100)))
 *
 * const program = Effect.reduceRight(
 *   [1, 2, 3, 4],
 *   0,
 *   (id, acc, i) =>
 *     processOrder(id)
 *       .pipe(Effect.map((order) => acc + order.price))
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // Order 4 processed
 * // Order 3 processed
 * // Order 2 processed
 * // Order 1 processed
 * // 1000
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const reduceRight: {
  <A, Z, R, E>(zero: Z, f: (a: A, z: Z, i: number) => Effect<Z, E, R>): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z, i: number) => Effect<Z, E, R>): Effect<Z, E, R>
} = effect.reduceRight

/**
 * Reduces an `Iterable<Effect<A, E, R>>` to a single effect.
 *
 * **Details**
 *
 * This function processes a collection of effects and combines them into one
 * single effect. It starts with an initial effect (`zero`) and applies a
 * function `f` to each element in the collection.
 *
 * **Options**
 *
 * The function also allows you to customize how the effects are handled by
 * specifying options such as concurrency, batching, and how finalizers behave.
 * These options provide flexibility in running the effects concurrently or
 * adjusting other execution details.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const processOrder = (id: number) =>
 *   Effect.succeed({ id, price: 100 * id })
 *     .pipe(Effect.tap(() => Console.log(`Order ${id} processed`)), Effect.delay(500 - (id * 100)))
 *
 * const program = Effect.reduceEffect(
 *   [processOrder(1), processOrder(2), processOrder(3), processOrder(4)],
 *   Effect.succeed(0),
 *   (acc, order, i) => acc + order.price
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // Order 1 processed
 * // Order 2 processed
 * // Order 3 processed
 * // Order 4 processed
 * // 1000
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const reduceEffect: {
  <Z, E, R, Eff extends Effect<any, any, any>>(
    zero: Effect<Z, E, R>,
    f: (z: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): (elements: Iterable<Eff>) => Effect<Z, E | Effect.Error<Eff>, R | Effect.Context<Eff>>
  <Eff extends Effect<any, any, any>, Z, E, R>(
    elements: Iterable<Eff>,
    zero: Effect<Z, E, R>,
    f: (z: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<Z, E | Effect.Error<Eff>, R | Effect.Context<Eff>>
} = fiberRuntime.reduceEffect

/**
 * Replicates the given effect `n` times.
 *
 * **Details**
 *
 * This function takes an effect and replicates it a specified number of times
 * (`n`). The result is an array of `n` effects, each of which is identical to
 * the original effect.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const task = Effect.succeed("Hello, World!").pipe(
 *   Effect.tap(Console.log)
 * )
 *
 * const program = Effect.gen(function*() {
 *   // Replicate the task 3 times
 *   const tasks = Effect.replicate(task, 3)
 *   for (const t of tasks) {
 *     // Run each task
 *     yield* t
 *   }
 * })
 *
 * // Effect.runFork(program)
 * // Output:
 * // Hello, World!
 * // Hello, World!
 * // Hello, World!
 * ```
 *
 * @since 2.0.0
 */
export const replicate: {
  (n: number): <A, E, R>(self: Effect<A, E, R>) => Array<Effect<A, E, R>>
  <A, E, R>(self: Effect<A, E, R>, n: number): Array<Effect<A, E, R>>
} = fiberRuntime.replicate

/**
 * Performs this effect the specified number of times and collects the results.
 *
 * **Details**
 *
 * This function repeats an effect multiple times and collects the results into
 * an array. You specify how many times to execute the effect, and it runs that
 * many times, either in sequence or concurrently depending on the provided
 * options.
 *
 * **Options**
 *
 * If the `discard` option is set to `true`, the intermediate results are not
 * collected, and the final result of the operation is `void`.
 *
 * The function also allows you to customize how the effects are handled by
 * specifying options such as concurrency, batching, and how finalizers behave.
 * These options provide flexibility in running the effects concurrently or
 * adjusting other execution details.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * let counter = 0
 *
 * const task = Effect.sync(() => ++counter).pipe(
 *   Effect.tap(() => Console.log(`Task completed`))
 * )
 *
 * const program = Effect.gen(function*() {
 *   // Replicate the task 3 times and collect the results
 *   const results = yield* Effect.replicateEffect(task, 3)
 *   yield* Console.log(`Results: ${results.join(", ")}`)
 * })
 *
 * // Effect.runFork(program)
 * // Output:
 * // Task completed
 * // Task completed
 * // Task completed
 * // Results: 1, 2, 3
 * ```
 *
 * @since 2.0.0
 * @category Collecting
 */
export const replicateEffect: {
  (
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<Array<A>, E, R>
  (
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<void, E, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<Array<A>, E, R>
  <A, E, R>(
    self: Effect<A, E, R>,
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<void, E, R>
} = fiberRuntime.replicateEffect

/**
 * Applies an effectful operation to each element in a collection while
 * collecting both successes and failures.
 *
 * **Details**
 *
 * This function allows you to apply an effectful operation to every item in a
 * collection.
 *
 * Unlike {@link forEach}, which would stop at the first error, this function
 * continues processing all elements, accumulating both successes and failures.
 *
 * **When to Use**
 *
 * Use this function when you want to process every item in a collection, even
 * if some items fail. This is particularly useful when you need to perform
 * operations on all elements without halting due to an error.
 *
 * Keep in mind that if there are any failures, **all successes will be lost**,
 * so this function is not suitable when you need to keep the successful results
 * in case of errors.
 *
 * @see {@link forEach} for a similar function that stops at the first error.
 * @see {@link partition} when you need to separate successes and failures
 * instead of losing successes with errors.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<number[], [string, ...string[]], never>
 * //      ▼
 * const program = Effect.validateAll([1, 2, 3, 4, 5], (n) => {
 *   if (n < 4) {
 *     return Console.log(`item ${n}`).pipe(Effect.as(n))
 *   } else {
 *     return Effect.fail(`${n} is not less that 4`)
 *   }
 * })
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // item 1
 * // item 2
 * // item 3
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: [ '4 is not less that 4', '5 is not less that 4' ]
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error Accumulation
 */
export const validateAll: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): (elements: Iterable<A>) => Effect<Array<B>, RA.NonEmptyArray<E>, R>
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): (elements: Iterable<A>) => Effect<void, RA.NonEmptyArray<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): Effect<Array<B>, RA.NonEmptyArray<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<void, RA.NonEmptyArray<E>, R>
} = fiberRuntime.validateAll

/**
 * This function is similar to {@link validateAll} but with a key difference: it
 * returns the first successful result or all errors if none of the operations
 * succeed.
 *
 * **Details**
 *
 * This function processes a collection of elements and applies an effectful
 * operation to each. Unlike {@link validateAll}, which accumulates both
 * successes and failures, `Effect.validateFirst` stops and returns the first
 * success it encounters. If no success occurs, it returns all accumulated
 * errors. This can be useful when you are interested in the first successful
 * result and want to avoid processing further once a valid result is found.
 *
 * @see {@link validateAll} for a similar function that accumulates all results.
 * @see {@link firstSuccessOf} for a similar function that processes multiple
 * effects and returns the first successful one or the last error.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<number, string[], never>
 * //      ▼
 * const program = Effect.validateFirst([1, 2, 3, 4, 5], (n) => {
 *   if (n < 4) {
 *     return Effect.fail(`${n} is not less that 4`)
 *   } else {
 *     return Console.log(`item ${n}`).pipe(Effect.as(n))
 *   }
 * })
 *
 * // Effect.runPromise(program).then(console.log, console.error)
 * // Output:
 * // item 4
 * // 4
 * ```
 *
 * @since 2.0.0
 * @category Error Accumulation
 */
export const validateFirst: {
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): (elements: Iterable<A>) => Effect<B, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?:
      | {
        readonly concurrency?: Concurrency | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<B, Array<E>, R>
} = fiberRuntime.validateFirst

/**
 * Creates an `Effect` from a callback-based asynchronous function.
 *
 * **Details**
 *
 * The `resume` function:
 * - Must be called exactly once. Any additional calls will be ignored.
 * - Can return an optional `Effect` that will be run if the `Fiber` executing
 *   this `Effect` is interrupted. This can be useful in scenarios where you
 *   need to handle resource cleanup if the operation is interrupted.
 * - Can receive an `AbortSignal` to handle interruption if needed.
 *
 * The `FiberId` of the fiber that may complete the async callback may also be
 * specified using the `blockingOn` argument. This is called the "blocking
 * fiber" because it suspends the fiber executing the `async` effect (i.e.
 * semantically blocks the fiber from making progress). Specifying this fiber id
 * in cases where it is known will improve diagnostics, but not affect the
 * behavior of the returned effect.
 *
 * **When to Use**
 *
 * Use `Effect.async` when dealing with APIs that use callback-style instead of
 * `async/await` or `Promise`.
 *
 * @example
 * ```ts
 * // Title: Wrapping a Callback API
 * import { Effect } from "effect"
 * import * as NodeFS from "node:fs"
 *
 * const readFile = (filename: string) =>
 *   Effect.async<Buffer, Error>((resume) => {
 *     NodeFS.readFile(filename, (error, data) => {
 *       if (error) {
 *         // Resume with a failed Effect if an error occurs
 *         resume(Effect.fail(error))
 *       } else {
 *         // Resume with a succeeded Effect if successful
 *         resume(Effect.succeed(data))
 *       }
 *     })
 *   })
 *
 * //      ┌─── Effect<Buffer, Error, never>
 * //      ▼
 * const program = readFile("example.txt")
 * ```
 *
 * @example
 * // Title: Handling Interruption with Cleanup
 * import { Effect, Fiber } from "effect"
 * import * as NodeFS from "node:fs"
 *
 * // Simulates a long-running operation to write to a file
 * const writeFileWithCleanup = (filename: string, data: string) =>
 *   Effect.async<void, Error>((resume) => {
 *     const writeStream = NodeFS.createWriteStream(filename)
 *
 *     // Start writing data to the file
 *     writeStream.write(data)
 *
 *     // When the stream is finished, resume with success
 *     writeStream.on("finish", () => resume(Effect.void))
 *
 *     // In case of an error during writing, resume with failure
 *     writeStream.on("error", (err) => resume(Effect.fail(err)))
 *
 *     // Handle interruption by returning a cleanup effect
 *     return Effect.sync(() => {
 *       console.log(`Cleaning up ${filename}`)
 *       NodeFS.unlinkSync(filename)
 *     })
 *   })
 *
 * const program = Effect.gen(function* () {
 *   const fiber = yield* Effect.fork(
 *     writeFileWithCleanup("example.txt", "Some long data...")
 *   )
 *   // Simulate interrupting the fiber after 1 second
 *   yield* Effect.sleep("1 second")
 *   yield* Fiber.interrupt(fiber) // This will trigger the cleanup
 * })
 *
 * // Run the program
 * // Effect.runPromise(program)
 * // Output:
 * // Cleaning up example.txt
 *
 * @example
 * // Title: Handling Interruption with AbortSignal
 * import { Effect, Fiber } from "effect"
 *
 * // A task that supports interruption using AbortSignal
 * const interruptibleTask = Effect.async<void, Error>((resume, signal) => {
 *   // Handle interruption
 *   signal.addEventListener("abort", () => {
 *     console.log("Abort signal received")
 *     clearTimeout(timeoutId)
 *   })
 *
 *   // Simulate a long-running task
 *   const timeoutId = setTimeout(() => {
 *     console.log("Operation completed")
 *     resume(Effect.void)
 *   }, 2000)
 * })
 *
 * const program = Effect.gen(function* () {
 *   const fiber = yield* Effect.fork(interruptibleTask)
 *   // Simulate interrupting the fiber after 1 second
 *   yield* Effect.sleep("1 second")
 *   yield* Fiber.interrupt(fiber)
 * })
 *
 * // Run the program
 * // Effect.runPromise(program)
 * // Output:
 * // Abort signal received
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const async: <A, E = never, R = never>(
  resume: (callback: (_: Effect<A, E, R>) => void, signal: AbortSignal) => void | Effect<void, never, R>,
  blockingOn?: FiberId.FiberId
) => Effect<A, E, R> = core.async

/**
 * A variant of {@link async} where the registration function may return an `Effect`.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const asyncEffect: <A, E, R, R3, E2, R2>(
  register: (callback: (_: Effect<A, E, R>) => void) => Effect<Effect<void, never, R3> | void, E2, R2>
) => Effect<A, E | E2, R | R2 | R3> = runtime_.asyncEffect

/**
 * Low level constructor that enables for custom stack tracing cutpoints.
 *
 * It is meant to be called with a bag of instructions that become available in
 * the "this" of the effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const throwingFunction = () => { throw new Error() }
 * const blowUp = Effect.custom(throwingFunction, function() {
 *   return Effect.succeed(this.effect_instruction_i0())
 * })
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
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
 * @category Creating Effects
 */
export const withFiberRuntime: <A, E = never, R = never>(
  withRuntime: (
    fiber: Fiber.RuntimeFiber<A, E>,
    status: FiberStatus.Running
  ) => Effect<A, E, R>
) => Effect<A, E, R> = core.withFiberRuntime

/**
 * Creates an `Effect` that represents a recoverable error.
 *
 * **When to Use**
 *
 * Use this function to explicitly signal an error in an `Effect`. The error
 * will keep propagating unless it is handled. You can handle the error with
 * functions like {@link catchAll} or {@link catchTag}.
 *
 * @see {@link succeed} to create an effect that represents a successful value.
 *
 * @example
 * ```ts
 * // Title: Creating a Failed Effect
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<never, Error, never>
 * //      ▼
 * const failure = Effect.fail(
 *   new Error("Operation failed due to network error")
 * )
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const fail: <E>(error: E) => Effect<never, E> = core.fail

/**
 * Creates an `Effect` that fails with the specified error, evaluated lazily.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Effect<never, E> = core.failSync

/**
 * Creates an `Effect` that fails with the specified `Cause`.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E> = core.failCause

/**
 * Creates an `Effect` that fails with the specified `Cause`, evaluated lazily.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Effect<never, E> = core.failCauseSync

/**
 * Creates an effect that terminates a fiber with a specified error.
 *
 * **Details**
 *
 * This function is used to signal a defect, which represents a critical and
 * unexpected error in the code. When invoked, it produces an effect that does
 * not handle the error and instead terminates the fiber.
 *
 * The error channel of the resulting effect is of type `never`, indicating that
 * it cannot recover from this failure.
 *
 * **When to Use**
 *
 * Use this function when encountering unexpected conditions in your code that
 * should not be handled as regular errors but instead represent unrecoverable
 * defects.
 *
 * @see {@link dieSync} for a variant that throws a specified error, evaluated
 * lazily.
 * @see {@link dieMessage} for a variant that throws a `RuntimeException` with a
 * message.
 *
 * @example
 * ```ts
 * // Title: Terminating on Division by Zero with a Specified Error
 * import { Effect } from "effect"
 *
 * const divide = (a: number, b: number) =>
 *   b === 0
 *     ? Effect.die(new Error("Cannot divide by zero"))
 *     : Effect.succeed(a / b)
 *
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const program = divide(1, 0)
 *
 * // Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: Cannot divide by zero
 * //   ...stack trace...
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const die: (defect: unknown) => Effect<never> = core.die

/**
 * Creates an effect that terminates a fiber with a `RuntimeException`
 * containing the specified message.
 *
 * **Details**
 *
 * This function is used to signal a defect, representing a critical and
 * unexpected error in the code. When invoked, it produces an effect that
 * terminates the fiber with a `RuntimeException` carrying the given message.
 *
 * The resulting effect has an error channel of type `never`, indicating it does
 * not handle or recover from the error.
 *
 * **When to Use**
 *
 * Use this function when you want to terminate a fiber due to an unrecoverable
 * defect and include a clear explanation in the message.
 *
 * @see {@link die} for a variant that throws a specified error.
 * @see {@link dieSync} for a variant that throws a specified error, evaluated
 * lazily.
 *
 * @example
 * ```ts
 * // Title: Terminating on Division by Zero with a Specified Message
 * import { Effect } from "effect"
 *
 * const divide = (a: number, b: number) =>
 *   b === 0
 *     ? Effect.dieMessage("Cannot divide by zero")
 *     : Effect.succeed(a / b)
 *
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const program = divide(1, 0)
 *
 * // Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) RuntimeException: Cannot divide by zero
 * //   ...stack trace...
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const dieMessage: (message: string) => Effect<never> = core.dieMessage

/**
 * Creates an effect that dies with the specified error, evaluated lazily.
 *
 * **Details**
 *
 * This function allows you to create an effect that will terminate with a fatal error.
 * The error is provided as a lazy argument, meaning it will only be evaluated when the effect runs.
 *
 * @see {@link die} if you don't need to evaluate the error lazily.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Effect<never> = core.dieSync

/**
 * Provides a way to write effectful code using generator functions, simplifying
 * control flow and error handling.
 *
 * **When to Use**
 *
 * `Effect.gen` allows you to write code that looks and behaves like synchronous
 * code, but it can handle asynchronous tasks, errors, and complex control flow
 * (like loops and conditions). It helps make asynchronous code more readable
 * and easier to manage.
 *
 * The generator functions work similarly to `async/await` but with more
 * explicit control over the execution of effects. You can `yield*` values from
 * effects and return the final result at the end.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const addServiceCharge = (amount: number) => amount + 1
 *
 * const applyDiscount = (
 *   total: number,
 *   discountRate: number
 * ): Effect.Effect<number, Error> =>
 *   discountRate === 0
 *     ? Effect.fail(new Error("Discount rate cannot be zero"))
 *     : Effect.succeed(total - (total * discountRate) / 100)
 *
 * const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
 *
 * const fetchDiscountRate = Effect.promise(() => Promise.resolve(5))
 *
 * export const program = Effect.gen(function* () {
 *   const transactionAmount = yield* fetchTransactionAmount
 *   const discountRate = yield* fetchDiscountRate
 *   const discountedAmount = yield* applyDiscount(
 *     transactionAmount,
 *     discountRate
 *   )
 *   const finalAmount = addServiceCharge(discountedAmount)
 *   return `Final amount to charge: ${finalAmount}`
 * })
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
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
} = core.gen

/**
 * @since 2.0.0
 * @category Models
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
 * An effect that that runs indefinitely and never produces any result. The
 * moral equivalent of `while(true) {}`, only without the wasted CPU cycles.
 *
 * **When to Use**
 *
 * It could be useful for long-running background tasks or to simulate waiting
 * behavior without actually consuming resources. This effect is ideal for cases
 * where you want to keep the program alive or in a certain state without
 * performing any active work.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const never: Effect<never> = core.never

/**
 * Ensures the `Option` is `None`, returning `void`. Otherwise, raises a
 * `NoSuchElementException`.
 *
 * **Details**
 *
 * This function checks if the provided `Option` is `None`. If it is, it returns
 * an effect that produces no result (i.e., `void`). If the `Option` is not
 * `None` (i.e., it contains a value), the function will raise a
 * `NoSuchElementException` error.
 *
 * **When to Use**
 *
 * This is useful when you want to ensure that a certain value is absent (i.e.,
 * `None`) before continuing execution, and to handle cases where the value is
 * unexpectedly present.
 *
 * @since 2.0.0
 */
export const none: <A, E, R>(
  self: Effect<Option.Option<A>, E, R>
) => Effect<void, E | Cause.NoSuchElementException, R> = effect.none

/**
 * Creates an `Effect` that represents an asynchronous computation guaranteed to
 * succeed.
 *
 * **Details**
 *
 * The provided function (`thunk`) returns a `Promise` that should never reject; if it does, the error
 * will be treated as a "defect".
 *
 * This defect is not a standard error but indicates a flaw in the logic that
 * was expected to be error-free. You can think of it similar to an unexpected
 * crash in the program, which can be further managed or logged using tools like
 * {@link catchAllDefect}.
 *
 * **Interruptions**
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped `Promise` API.
 *
 * **When to Use**
 *
 * Use this function when you are sure the operation will not reject.
 *
 * @see {@link tryPromise} for a version that can handle failures.
 *
 * @example
 * ```ts
 * // Title: Delayed Message
 * import { Effect } from "effect"
 *
 * const delay = (message: string) =>
 *   Effect.promise<string>(
 *     () =>
 *       new Promise((resolve) => {
 *         setTimeout(() => {
 *           resolve(message)
 *         }, 2000)
 *       })
 *   )
 *
 * //      ┌─── Effect<string, never, never>
 * //      ▼
 * const program = delay("Async operation completed successfully!")
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const promise: <A>(
  evaluate: (signal: AbortSignal) => PromiseLike<A>
) => Effect<A> = effect.promise

/**
 * Creates an `Effect` that always succeeds with a given value.
 *
 * **When to Use**
 *
 * Use this function when you need an effect that completes successfully with a
 * specific value without any errors or external dependencies.
 *
 * @see {@link fail} to create an effect that represents a failure.
 *
 * @example
 * ```ts
 * // Title: Creating a Successful Effect
 * import { Effect } from "effect"
 *
 * // Creating an effect that represents a successful scenario
 * //
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const success = Effect.succeed(42)
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeed: <A>(value: A) => Effect<A> = core.succeed

/**
 * Returns an effect which succeeds with `None`.
 *
 * **When to Use**
 *
 * Use this function when you need to represent the absence of a value in your
 * code, especially when working with optional data. This can be helpful when
 * you want to indicate that no result is available without throwing an error or
 * performing additional logic.
 *
 * @see {@link succeedSome} to create an effect that succeeds with a `Some` value.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeedNone: Effect<Option.Option<never>> = effect.succeedNone

/**
 * Returns an effect which succeeds with the value wrapped in a `Some`.
 *
 * @see {@link succeedNone} for a similar function that returns `None` when the value is absent.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeedSome: <A>(value: A) => Effect<Option.Option<A>> = effect.succeedSome

/**
 * Delays the creation of an `Effect` until it is actually needed.
 *
 * **Details**
 *
 * The `Effect.suspend` function takes a thunk that represents the effect and
 * wraps it in a suspended effect. This means the effect will not be created
 * until it is explicitly needed, which is helpful in various scenarios:
 * - **Lazy Evaluation**: Helps optimize performance by deferring computations,
 *   especially when the effect might not be needed, or when its computation is
 *   expensive. This also ensures that any side effects or scoped captures are
 *   re-executed on each invocation.
 * - **Handling Circular Dependencies**: Useful in managing circular
 *   dependencies, such as recursive functions that need to avoid eager
 *   evaluation to prevent stack overflow.
 * - **Unifying Return Types**: Can help TypeScript unify return types in
 *   situations where multiple branches of logic return different effects,
 *   simplifying type inference.
 *
 * **When to Use**
 *
 * Use this function when you need to defer the evaluation of an effect until it
 * is required. This is particularly useful for optimizing expensive
 * computations, managing circular dependencies, or resolving type inference
 * issues.
 *
 * @example
 * ```ts
 * // Title: Lazy Evaluation with Side Effects
 * import { Effect } from "effect"
 *
 * let i = 0
 *
 * const bad = Effect.succeed(i++)
 *
 * const good = Effect.suspend(() => Effect.succeed(i++))
 *
 * console.log(Effect.runSync(bad)) // Output: 0
 * console.log(Effect.runSync(bad)) // Output: 0
 *
 * console.log(Effect.runSync(good)) // Output: 1
 * console.log(Effect.runSync(good)) // Output: 2
 * ```
 *
 * @example
 * // Title: Recursive Fibonacci
 * import { Effect } from "effect"
 *
 * const blowsUp = (n: number): Effect.Effect<number> =>
 *   n < 2
 *     ? Effect.succeed(1)
 *     : Effect.zipWith(blowsUp(n - 1), blowsUp(n - 2), (a, b) => a + b)
 *
 * // console.log(Effect.runSync(blowsUp(32)))
 * // crash: JavaScript heap out of memory
 *
 * const allGood = (n: number): Effect.Effect<number> =>
 *   n < 2
 *     ? Effect.succeed(1)
 *     : Effect.zipWith(
 *         Effect.suspend(() => allGood(n - 1)),
 *         Effect.suspend(() => allGood(n - 2)),
 *         (a, b) => a + b
 *       )
 *
 * console.log(Effect.runSync(allGood(32)))
 * // Output: 3524578
 *
 * @example
 * // Title: Using Effect.suspend to Help TypeScript Infer Types
 * import { Effect } from "effect"
 *
 * //   Without suspend, TypeScript may struggle with type inference.
 * //   Inferred type:
 * //     (a: number, b: number) =>
 * //       Effect<never, Error, never> | Effect<number, never, never>
 * const withoutSuspend = (a: number, b: number) =>
 *   b === 0
 *     ? Effect.fail(new Error("Cannot divide by zero"))
 *     : Effect.succeed(a / b)
 *
 * //   Using suspend to unify return types.
 * //   Inferred type:
 * //     (a: number, b: number) => Effect<number, Error, never>
 * const withSuspend = (a: number, b: number) =>
 *   Effect.suspend(() =>
 *     b === 0
 *       ? Effect.fail(new Error("Cannot divide by zero"))
 *       : Effect.succeed(a / b)
 *   )
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const suspend: <A, E, R>(effect: LazyArg<Effect<A, E, R>>) => Effect<A, E, R> = core.suspend

/**
 * Creates an `Effect` that represents a synchronous side-effectful computation.
 *
 * **Details**
 *
 * The provided function (`thunk`) must not throw errors; if it does, the error
 * will be treated as a "defect".
 *
 * This defect is not a standard error but indicates a flaw in the logic that
 * was expected to be error-free. You can think of it similar to an unexpected
 * crash in the program, which can be further managed or logged using tools like
 * {@link catchAllDefect}.
 *
 * **When to Use**
 *
 * Use this function when you are sure the operation will not fail.
 *
 * @see {@link try_ | try} for a version that can handle failures.
 *
 * @example
 * ```ts
 * // Title: Logging a Message
 * import { Effect } from "effect"
 *
 * const log = (message: string) =>
 *   Effect.sync(() => {
 *     console.log(message) // side effect
 *   })
 *
 * //      ┌─── Effect<void, never, never>
 * //      ▼
 * const program = log("Hello, World!")
 * ```
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const sync: <A>(thunk: LazyArg<A>) => Effect<A> = core.sync

const _void: Effect<void> = core.void

export {
  /**
   * Represents an effect that does nothing and produces no value.
   *
   * **When to Use**
   *
   * Use this effect when you need to represent an effect that does nothing.
   * This is useful in scenarios where you need to satisfy an effect-based
   * interface or control program flow without performing any operations. For
   * example, it can be used in situations where you want to return an effect
   * from a function but do not need to compute or return any result.
   *
   * @since 2.0.0
   * @category Creating Effects
   */
  _void as void
}

/**
 * @since 2.0.0
 * @category Creating Effects
 */
export const yieldNow: (options?: {
  readonly priority?: number | undefined
}) => Effect<void> = core.yieldNow

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
   * Recovers from a specified error by catching it and handling it with a provided function.
   *
   * **Details**
   *
   * This function allows you to recover from specific errors that occur during
   * the execution of an effect. It works by catching a specific type of error
   * (identified by a discriminator) and then handling it using a provided
   * handler function. The handler can return a new effect that helps recover
   * from the error, allowing the program to continue. If the error doesn't
   * match the specified type, the function allows the original effect to
   * continue as it was.
   *
   * @see {@link catchTag} for a version that can recover from errors based on a `_tag` discriminator.
   *
   * @example
   * ```ts
   * import { Console, Effect } from "effect"
   *
   * class NetworkError {
   *   readonly _tag = "NetworkError"
   * }
   * class ValidationError {
   *   readonly _tag = "ValidationError"
   * }
   *
   * // Simulate an effect that may fail
   * const task: Effect.Effect<never, NetworkError | ValidationError, never> = Effect.fail(new NetworkError())
   *
   * const program = Effect.gen(function*() {
   *   const result = yield* Effect.catch(task, "_tag", {
   *     failure: "NetworkError",
   *     onFailure: (error) => Effect.succeed(`recovered from error: ${error._tag}`)
   *   })
   *   console.log(`Result: ${result}`)
   * })
   *
   * // Effect.runFork(program)
   * // Output: Result: recovered from error: NetworkError
   * ```
   *
   * @since 2.0.0
   * @category Error handling
   */
  _catch as catch
}

/**
 * Handles all errors in an effect by providing a fallback effect.
 *
 * **Details**
 *
 * This function catches any errors that may occur during the execution of an
 * effect and allows you to handle them by specifying a fallback effect. This
 * ensures that the program continues without failing by recovering from errors
 * using the provided fallback logic.
 *
 * **Note**: This function only handles recoverable errors. It will not recover
 * from unrecoverable defects.
 *
 * @see {@link catchAllCause} for a version that can recover from both
 * recoverable and unrecoverable errors.
 *
 * @example
 * ```ts
 * // Title: Providing Recovery Logic for Recoverable Errors
 * import { Effect, Random } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, never, never>
 * //      ▼
 * const recovered = program.pipe(
 *   Effect.catchAll((error) =>
 *     Effect.succeed(`Recovering from ${error._tag}`)
 *   )
 * )
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const catchAll: {
  <E, A2, E2, R2>(f: (e: E) => Effect<A2, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, f: (e: E) => Effect<A2, E2, R2>): Effect<A2 | A, E2, R2 | R>
} = core.catchAll

/**
 * Handles both recoverable and unrecoverable errors by providing a recovery
 * effect.
 *
 * **When to Use**
 *
 * The `catchAllCause` function allows you to handle all errors, including
 * unrecoverable defects, by providing a recovery effect. The recovery logic is
 * based on the `Cause` of the error, which provides detailed information about
 * the failure.
 *
 * **When to Recover from Defects**
 *
 * Defects are unexpected errors that typically shouldn't be recovered from, as
 * they often indicate serious issues. However, in some cases, such as
 * dynamically loaded plugins, controlled recovery might be needed.
 *
 * @example
 * ```ts
 * // Title: Recovering from All Errors
 * import { Cause, Effect } from "effect"
 *
 * // Define an effect that may fail with a recoverable or unrecoverable error
 * const program = Effect.fail("Something went wrong!")
 *
 * // Recover from all errors by examining the cause
 * const recovered = program.pipe(
 *   Effect.catchAllCause((cause) =>
 *     Cause.isFailType(cause)
 *       ? Effect.succeed("Recovered from a regular error")
 *       : Effect.succeed("Recovered from a defect")
 *   )
 * )
 *
 * // Effect.runPromise(recovered).then(console.log)
 * // Output: "Recovered from a regular error"
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Recovers from all defects using a provided recovery function.
 *
 * **When to Use**
 *
 * There is no sensible way to recover from defects. This method should be used
 * only at the boundary between Effect and an external system, to transmit
 * information on a defect for diagnostic or explanatory purposes.
 *
 * **Details**
 *
 * `catchAllDefect` allows you to handle defects, which are unexpected errors
 * that usually cause the program to terminate. This function lets you recover
 * from these defects by providing a function that handles the error. However,
 * it does not handle expected errors (like those from {@link fail}) or
 * execution interruptions (like those from {@link interrupt}).
 *
 * **When to Recover from Defects**
 *
 * Defects are unexpected errors that typically shouldn't be recovered from, as
 * they often indicate serious issues. However, in some cases, such as
 * dynamically loaded plugins, controlled recovery might be needed.
 *
 * @example
 * ```ts
 * // Title: Handling All Defects
 * import { Effect, Cause, Console } from "effect"
 *
 * // Simulating a runtime error
 * const task = Effect.dieMessage("Boom!")
 *
 * const program = Effect.catchAllDefect(task, (defect) => {
 *   if (Cause.isRuntimeException(defect)) {
 *     return Console.log(
 *       `RuntimeException defect caught: ${defect.message}`
 *     )
 *   }
 *   return Console.log("Unknown defect caught.")
 * })
 *
 * // We get an Exit.Success because we caught all defects
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // RuntimeException defect caught: Boom!
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: undefined
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Recovers from specific errors based on a predicate.
 *
 * **When to Use**
 *
 * `catchIf` works similarly to {@link catchSome}, but it allows you to
 * recover from errors by providing a predicate function. If the predicate
 * matches the error, the recovery effect is applied. This function doesn't
 * alter the error type, so the resulting effect still carries the original
 * error type unless a user-defined type guard is used to narrow the type.
 *
 * @example
 * ```ts
 * // Title: Catching Specific Errors with a Predicate
 * import { Effect, Random } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, ValidationError, never>
 * //      ▼
 * const recovered = program.pipe(
 *   Effect.catchIf(
 *     // Only handle HttpError errors
 *     (error) => error._tag === "HttpError",
 *     () => Effect.succeed("Recovering from HttpError")
 *   )
 * )
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Catches and recovers from specific types of errors, allowing you to attempt
 * recovery only for certain errors.
 *
 * **Details**
 *
 * `catchSome` lets you selectively catch and handle errors of certain
 * types by providing a recovery effect for specific errors. If the error
 * matches a condition, recovery is attempted; if not, it doesn't affect the
 * program. This function doesn't alter the error type, meaning the error type
 * remains the same as in the original effect.
 *
 * @see {@link catchIf} for a version that allows you to recover from errors based on a predicate.
 *
 * @example
 * ```ts
 * // Title: Handling Specific Errors with Effect.catchSome
 * import { Effect, Random, Option } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const recovered = program.pipe(
 *   Effect.catchSome((error) => {
 *     // Only handle HttpError errors
 *     if (error._tag === "HttpError") {
 *       return Option.some(Effect.succeed("Recovering from HttpError"))
 *     } else {
 *       return Option.none()
 *     }
 *   })
 * )
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Recovers from specific causes using a provided partial function.
 *
 * @see {@link catchSome} for a version that allows you to recover from errors.
 * @see {@link catchSomeDefect} for a version that allows you to recover from defects.
 *
 * @since 2.0.0
 * @category Error handling
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
 * Recovers from specific defects using a provided partial function.
 *
 * **Details**
 *
 * `catchSomeDefect` allows you to handle specific defects, which are
 * unexpected errors that can cause the program to stop. It uses a partial
 * function to catch only certain defects and ignores others. The function does
 * not handle expected errors (such as those caused by {@link fail}) or
 * interruptions in execution (like those caused by {@link interrupt}).
 *
 * This function provides a way to handle certain types of defects while
 * allowing others to propagate and cause failure in the program.
 *
 * **Note**: There is no sensible way to recover from defects. This method
 * should be used only at the boundary between Effect and an external system, to
 * transmit information on a defect for diagnostic or explanatory purposes.
 *
 * **How the Partial Function Works**
 *
 * The function provided to `catchSomeDefect` acts as a filter and a handler for defects:
 * - It receives the defect as an input.
 * - If the defect matches a specific condition (e.g., a certain error type), the function returns
 *   an `Option.some` containing the recovery logic.
 * - If the defect does not match, the function returns `Option.none`, allowing the defect to propagate.
 *
 * @example
 * ```ts
 * // Title: Handling Specific Defects
 * import { Effect, Cause, Option, Console } from "effect"
 *
 * // Simulating a runtime error
 * const task = Effect.dieMessage("Boom!")
 *
 * const program = Effect.catchSomeDefect(task, (defect) => {
 *   if (Cause.isIllegalArgumentException(defect)) {
 *     return Option.some(
 *       Console.log(
 *         `Caught an IllegalArgumentException defect: ${defect.message}`
 *       )
 *     )
 *   }
 *   return Option.none()
 * })
 *
 * // Since we are only catching IllegalArgumentException
 * // we will get an Exit.Failure because we simulated a runtime error.
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Die',
 * //     defect: { _tag: 'RuntimeException' }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Catches and handles specific errors by their `_tag` field, which is used as a
 * discriminator.
 *
 * **When to Use**
 *
 * `catchTag` is useful when your errors are tagged with a readonly `_tag` field
 * that identifies the error type. You can use this function to handle specific
 * error types by matching the `_tag` value. This allows for precise error
 * handling, ensuring that only specific errors are caught and handled.
 *
 * The error type must have a readonly `_tag` field to use `catchTag`. This
 * field is used to identify and match errors.
 *
 * @see {@link catchTags} for a version that allows you to handle multiple error
 * types at once.
 *
 * @example
 * ```ts
 * // Title: Handling Errors by Tag
 * import { Effect, Random } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, ValidationError, never>
 * //      ▼
 * const recovered = program.pipe(
 *   // Only handle HttpError errors
 *   Effect.catchTag("HttpError", (_HttpError) =>
 *     Effect.succeed("Recovering from HttpError")
 *   )
 * )
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: NoInfer<Extract<E, { _tag: K }>>) => Effect<A1, E1, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
    self: Effect<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): Effect<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = effect.catchTag

/**
 * Handles multiple errors in a single block of code using their `_tag` field.
 *
 * **When to Use**
 *
 * `catchTags` is a convenient way to handle multiple error types at
 * once. Instead of using {@link catchTag} multiple times, you can pass an
 * object where each key is an error type's `_tag`, and the value is the handler
 * for that specific error. This allows you to catch and recover from multiple
 * error types in a single call.
 *
 * The error type must have a readonly `_tag` field to use `catchTag`. This
 * field is used to identify and match errors.
 *
 * @example
 * ```ts
 * // Title: Handling Multiple Tagged Error Types at Once
 * import { Effect, Random } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, never, never>
 * //      ▼
 * const recovered = program.pipe(
 *   Effect.catchTags({
 *     HttpError: (_HttpError) =>
 *       Effect.succeed(`Recovering from HttpError`),
 *     ValidationError: (_ValidationError) =>
 *       Effect.succeed(`Recovering from ValidationError`)
 *   })
 * )
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
 * Retrieves the cause of a failure in an effect.
 *
 * **Details**
 *
 * This function allows you to expose the detailed cause of an effect, which
 * includes a more precise representation of failures, such as error messages
 * and defects.
 *
 * **When to Use**
 *
 * This function is helpful when you need to inspect the cause of a failure in
 * an effect, giving you more information than just the error message. It can be
 * used to log, handle, or analyze failures in more detail, including
 * distinguishing between different types of defects (e.g., runtime exceptions,
 * interruptions, etc.).
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const program = Effect.fail("Oh uh!").pipe(Effect.as(2))
 *
 * //      ┌─── Effect<void, never, never>
 * //      ▼
 * const recovered = Effect.gen(function* () {
 *   const cause = yield* Effect.cause(program)
 *   yield* Console.log(cause)
 * })
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const cause: <A, E, R>(self: Effect<A, E, R>) => Effect<Cause.Cause<E>, never, R> = effect.cause

/**
 * Runs an effect repeatedly until it succeeds, ignoring errors.
 *
 * **Details**
 *
 * This function takes an effect and runs it repeatedly until the effect
 * successfully completes. If the effect fails, it will ignore the error and
 * retry the operation. This is useful when you need to perform a task that may
 * fail occasionally, but you want to keep trying until it eventually succeeds.
 * It works by repeatedly executing the effect until it no longer throws an
 * error.
 *
 * **When to Use**
 *
 * Use this function when you want to retry an operation multiple times until it
 * succeeds. It is helpful in cases where the operation may fail temporarily
 * (e.g., a network request), and you want to keep trying without handling or
 * worrying about the errors.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * let counter = 0
 *
 * const effect = Effect.try(() => {
 *   counter++
 *   if (counter < 3) {
 *     console.log("running effect")
 *     throw new Error("error")
 *   } else {
 *     console.log("effect done")
 *     return "some result"
 *   }
 * })
 *
 * const program = Effect.eventually(effect)
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // running effect
 * // running effect
 * // effect done
 * // some result
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const eventually: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = effect.eventually

/**
 * Discards both the success and failure values of an effect.
 *
 * **When to Use**
 *
 * `ignore` allows you to run an effect without caring about its result, whether
 * it succeeds or fails. This is useful when you only care about the side
 * effects of the effect and do not need to handle or process its outcome.
 *
 * @see {@link ignoreLogged} to log failures while ignoring them.
 *
 * @example
 * ```ts
 * // Title: Using Effect.ignore to Discard Values
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const task = Effect.fail("Uh oh!").pipe(Effect.as(5))
 *
 * //      ┌─── Effect<void, never, never>
 * //      ▼
 * const program = Effect.ignore(task)
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const ignore: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignore

/**
 * Ignores the result of an effect but logs any failures.
 *
 * **Details**
 *
 * This function takes an effect and returns a new effect that ignores whether
 * the original effect succeeds or fails. However, if the effect fails, it will
 * log the failure at the Debug level, so you can keep track of any issues that
 * arise.
 *
 * **When to Use**
 *
 * This is useful in scenarios where you want to continue with your program
 * regardless of the result of the effect, but you still want to be aware of
 * potential failures that may need attention later.
 *
 * @since 2.0.0
 * @category Error handling
 */
export const ignoreLogged: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignoreLogged

/**
 * Combines all errors from concurrent operations into a single error.
 *
 * **Details**
 *
 * This function is used when you have multiple operations running at the same
 * time, and you want to capture all the errors that occur across those
 * operations. Instead of handling each error separately, it combines all the
 * errors into one unified error.
 *
 * **When to Use**
 *
 * When using this function, any errors that occur in the concurrently running
 * operations will be grouped together into a single error. This helps simplify
 * error handling in cases where you don't need to differentiate between each
 * failure, but simply want to know that multiple failures occurred.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const fail1 = Effect.fail("Oh uh!")
 * const fail2 = Effect.fail("Oh no!")
 * const die = Effect.dieMessage("Boom!")
 *
 * // Run all effects concurrently and capture all errors
 * const program = Effect.all([fail1, fail2, die], {
 *   concurrency: "unbounded"
 * }).pipe(Effect.asVoid, Effect.parallelErrors)
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: [ 'Oh uh!', 'Oh no!' ] }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const parallelErrors: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Array<E>, R> = effect.parallelErrors

/**
 * Transforms an effect to expose detailed error causes.
 *
 * **Details**
 *
 * This function enhances an effect by providing detailed information about any
 * error, defect, or interruption that may occur during its execution. It
 * modifies the error channel of the effect so that it includes a full cause of
 * the failure, wrapped in a `Cause<E>` type.
 *
 * After applying this function, you can use operators like {@link catchAll} and
 * {@link catchTags} to handle specific types of errors.
 *
 * If you no longer need the detailed cause information, you can revert the
 * changes using {@link unsandbox} to return to the original error-handling
 * behavior.
 *
 * @see {@link unsandbox} to restore the original error handling.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<string, Error, never>
 * //      ▼
 * const task = Effect.fail(new Error("Oh uh!")).pipe(
 *   Effect.as("primary result")
 * )
 *
 * //      ┌─── Effect<string, Cause<Error>, never>
 * //      ▼
 * const sandboxed = Effect.sandbox(task)
 *
 * const program = Effect.catchTags(sandboxed, {
 *   Die: (cause) =>
 *     Console.log(`Caught a defect: ${cause.defect}`).pipe(
 *       Effect.as("fallback result on defect")
 *     ),
 *   Interrupt: (cause) =>
 *     Console.log(`Caught a defect: ${cause.fiberId}`).pipe(
 *       Effect.as("fallback result on fiber interruption")
 *     ),
 *   Fail: (cause) =>
 *     Console.log(`Caught a defect: ${cause.error}`).pipe(
 *       Effect.as("fallback result on failure")
 *     )
 * })
 *
 * // Restore the original error handling with unsandbox
 * const main = Effect.unsandbox(program)
 *
 * // Effect.runPromise(main).then(console.log)
 * // Output:
 * // Caught a defect: Oh uh!
 * // fallback result on failure
 * ```
 *
 * @since 2.0.0
 * @category Error handling
 */
export const sandbox: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Cause.Cause<E>, R> = effect.sandbox

/**
 * @since 2.0.0
 * @category Error handling
 */
export declare namespace Retry {
  /**
   * @since 2.0.0
   * @category Error handling
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
   * @category Error handling
   */
  export interface Options<E> {
    while?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined
    until?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined
    times?: number | undefined
    schedule?: Schedule.Schedule<any, E, any> | undefined
  }
}

/**
 * Retries a failing effect based on a defined retry policy.
 *
 * **Details**
 *
 * The `Effect.retry` function takes an effect and a {@link Schedule} policy,
 * and will automatically retry the effect if it fails, following the rules of
 * the policy.
 *
 * If the effect ultimately succeeds, the result will be returned.
 *
 * If the maximum retries are exhausted and the effect still fails, the failure
 * is propagated.
 *
 * **When to Use**
 *
 * This can be useful when dealing with intermittent failures, such as network
 * issues or temporary resource unavailability. By defining a retry policy, you
 * can control the number of retries, the delay between them, and when to stop
 * retrying.
 *
 * @see {@link retryOrElse} for a version that allows you to run a fallback.
 * @see {@link repeat} if your retry condition is based on successful outcomes rather than errors.
 *
 * @example
 * ```ts
 * // Title: Retrying with a Fixed Delay
 * import { Effect, Schedule } from "effect"
 *
 * let count = 0
 *
 * // Simulates an effect with possible failures
 * const task = Effect.async<string, Error>((resume) => {
 *   if (count <= 2) {
 *     count++
 *     console.log("failure")
 *     resume(Effect.fail(new Error()))
 *   } else {
 *     console.log("success")
 *     resume(Effect.succeed("yay!"))
 *   }
 * })
 *
 * // Define a repetition policy using a fixed delay between retries
 * const policy = Schedule.fixed("100 millis")
 *
 * const repeated = Effect.retry(task, policy)
 *
 * // Effect.runPromise(repeated).then(console.log)
 * // Output:
 * // failure
 * // failure
 * // failure
 * // success
 * // yay!
 * ```
 *
 * @example
 * ```ts
 * // Title: Retrying a Task up to 5 times
 * import { Effect } from "effect"
 *
 * let count = 0
 *
 * // Simulates an effect with possible failures
 * const task = Effect.async<string, Error>((resume) => {
 *   if (count <= 2) {
 *     count++
 *     console.log("failure")
 *     resume(Effect.fail(new Error()))
 *   } else {
 *     console.log("success")
 *     resume(Effect.succeed("yay!"))
 *   }
 * })
 *
 * // Retry the task up to 5 times
 * // Effect.runPromise(Effect.retry(task, { times: 5 }))
 * // Output:
 * // failure
 * // failure
 * // failure
 * // success
 * ```
 *
 * @example
 * ```ts
 * // Title: Retrying Until a Specific Condition is Met
 * import { Effect } from "effect"
 *
 * let count = 0
 *
 * // Define an effect that simulates varying error on each invocation
 * const action = Effect.failSync(() => {
 *   console.log(`Action called ${++count} time(s)`)
 *   return `Error ${count}`
 * })
 *
 * // Retry the action until a specific condition is met
 * const program = Effect.retry(action, {
 *   until: (err) => err === "Error 3"
 * })
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Action called 1 time(s)
 * // Action called 2 time(s)
 * // Action called 3 time(s)
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'Error 3' }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
} = schedule_.retry_combined

/**
 * Retries a failing effect and runs a fallback effect if retries are exhausted.
 *
 * **Details**
 *
 * The `Effect.retryOrElse` function attempts to retry a failing effect multiple
 * times according to a defined {@link Schedule} policy.
 *
 * If the retries are exhausted and the effect still fails, it runs a fallback
 * effect instead.
 *
 * **When to Use**
 *
 * This function is useful when you want to handle failures gracefully by
 * specifying an alternative action after repeated failures.
 *
 * @see {@link retry} for a version that does not run a fallback effect.
 *
 * @example
 * ```ts
 * // Title: Retrying with Fallback
 * import { Effect, Schedule, Console } from "effect"
 *
 * let count = 0
 *
 * // Simulates an effect with possible failures
 * const task = Effect.async<string, Error>((resume) => {
 *   if (count <= 2) {
 *     count++
 *     console.log("failure")
 *     resume(Effect.fail(new Error()))
 *   } else {
 *     console.log("success")
 *     resume(Effect.succeed("yay!"))
 *   }
 * })
 *
 * // Retry the task with a delay between retries and a maximum of 2 retries
 * const policy = Schedule.addDelay(Schedule.recurs(2), () => "100 millis")
 *
 * // If all retries fail, run the fallback effect
 * const repeated = Effect.retryOrElse(
 *   task,
 *   policy,
 *   // fallback
 *   () => Console.log("orElse").pipe(Effect.as("default value"))
 * )
 *
 * // Effect.runPromise(repeated).then(console.log)
 * // Output:
 * // failure
 * // failure
 * // failure
 * // orElse
 * // default value
 * ```
 *
 * @since 2.0.0
 * @category Error handling
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
} = schedule_.retryOrElse_Effect

const try_: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Effect<A, E>
  <A>(thunk: LazyArg<A>): Effect<A, Cause.UnknownException>
} = effect.try_

export {
  /**
   * Creates an `Effect` that represents a synchronous computation that might
   * fail.
   *
   * **When to Use**
   *
   * In situations where you need to perform synchronous operations that might
   * fail, such as parsing JSON, you can use the `try` constructor. This
   * constructor is designed to handle operations that could throw exceptions by
   * capturing those exceptions and transforming them into manageable errors.
   *
   * **Error Handling**
   *
   * There are two ways to handle errors with `try`:
   *
   * 1. If you don't provide a `catch` function, the error is caught and the
   *    effect fails with an `UnknownException`.
   * 2. If you provide a `catch` function, the error is caught and the `catch`
   *    function maps it to an error of type `E`.
   *
   * @see {@link sync} if the effectful computation is synchronous and does not
   * throw errors.
   *
   * @example
   * ```ts
   * // Title: Safe JSON Parsing
   * import { Effect } from "effect"
   *
   * const parse = (input: string) =>
   *   // This might throw an error if input is not valid JSON
   *   Effect.try(() => JSON.parse(input))
   *
   * //      ┌─── Effect<any, UnknownException, never>
   * //      ▼
   * const program = parse("")
   *
   * ```
   * @example
   * // Title: Custom Error Handling
   * import { Effect } from "effect"
   *
   * const parse = (input: string) =>
   *   Effect.try({
   *     // JSON.parse may throw for bad input
   *     try: () => JSON.parse(input),
   *     // remap the error
   *     catch: (unknown) => new Error(`something went wrong ${unknown}`)
   *   })
   *
   * //      ┌─── Effect<any, Error, never>
   * //      ▼
   * const program = parse("")
   *
   * @since 2.0.0
   * @category Creating Effects
   */
  try_ as try
}

/**
 * Returns an effect that maps its success using the specified side-effecting
 * `try` function, converting any errors into typed failed effects using the
 * `catch` function.
 *
 * @see {@link tryPromise} for a version that works with asynchronous computations.
 *
 * @since 2.0.0
 * @category Error handling
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
 * Returns an effect that maps its success using the specified side-effecting
 * `try` function, converting any promise rejections into typed failed effects
 * using the `catch` function.
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped `Promise` API.
 *
 * @see {@link tryMap} for a version that works with synchronous computations.
 *
 * @since 2.0.0
 * @category Error handling
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
 * Creates an `Effect` that represents an asynchronous computation that might
 * fail.
 *
 * **When to Use**
 *
 * In situations where you need to perform asynchronous operations that might
 * fail, such as fetching data from an API, you can use the `tryPromise`
 * constructor. This constructor is designed to handle operations that could
 * throw exceptions by capturing those exceptions and transforming them into
 * manageable errors.
 *
 * **Error Handling**
 *
 * There are two ways to handle errors with `tryPromise`:
 *
 * 1. If you don't provide a `catch` function, the error is caught and the
 *    effect fails with an `UnknownException`.
 * 2. If you provide a `catch` function, the error is caught and the `catch`
 *    function maps it to an error of type `E`.
 *
 * **Interruptions**
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped `Promise` API.
 *
 * @see {@link promise} if the effectful computation is asynchronous and does not throw errors.
 *
 * @example
 * ```ts
 * // Title: Fetching a TODO Item
 * import { Effect } from "effect"
 *
 * const getTodo = (id: number) =>
 *   // Will catch any errors and propagate them as UnknownException
 *   Effect.tryPromise(() =>
 *     fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
 *   )
 *
 * //      ┌─── Effect<Response, UnknownException, never>
 * //      ▼
 * const program = getTodo(1)
 * ```
 *
 * @example
 * // Title: Custom Error Handling
 * import { Effect } from "effect"
 *
 * const getTodo = (id: number) =>
 *   Effect.tryPromise({
 *     try: () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
 *     // remap the error
 *     catch: (unknown) => new Error(`something went wrong ${unknown}`)
 *   })
 *
 * //      ┌─── Effect<Response, Error, never>
 * //      ▼
 * const program = getTodo(1)
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const tryPromise: {
  <A, E>(
    options: {
      readonly try: (signal: AbortSignal) => PromiseLike<A>
      readonly catch: (error: unknown) => E
    }
  ): Effect<A, E>
  <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A, Cause.UnknownException>
} = effect.tryPromise

/**
 * The `unsandbox` function is used to revert an effect that has been
 * sandboxed by {@link sandbox}. When you apply `unsandbox`, the
 * effect's error channel is restored to its original state, without the
 * detailed `Cause<E>` information. This means that any underlying causes of
 * errors, defects, or fiber interruptions are no longer exposed in the error
 * channel.
 *
 * This function is useful when you want to remove the detailed error tracking
 * provided by `sandbox` and return to the standard error handling for
 * your effect. Once unsandboxed, the effect behaves as if `sandbox` was
 * never applied.
 *
 * @see {@link sandbox} to expose the full cause of failures, defects, or interruptions.
 *
 * @since 2.0.0
 * @category Error handling
 */
export const unsandbox: <A, E, R>(self: Effect<A, Cause.Cause<E>, R>) => Effect<A, E, R> = effect.unsandbox

/**
 * Allows interruption of the current fiber, even in uninterruptible regions.
 *
 * **Details**
 *
 * This effect checks whether any other fibers are attempting to interrupt the
 * current fiber. If so, it allows the current fiber to perform a
 * self-interruption.
 *
 * **When to Use**
 *
 * This is useful in situations where you want to allow interruption to happen
 * even in regions of the code that are normally uninterruptible.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const allowInterrupt: Effect<void> = effect.allowInterrupt

/**
 * Checks if interruption is allowed and executes a callback accordingly.
 *
 * **Details**
 *
 * This function checks the current interrupt status of the running fiber. It
 * then calls the provided callback, passing a boolean indicating whether
 * interruption is allowed.
 *
 * **When to Use**
 *
 * This is useful for handling specific logic based on whether the current
 * operation can be interrupted, such as when performing asynchronous operations
 * or handling cancellation.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.checkInterruptible((isInterruptible) => {
 *     if (isInterruptible) {
 *       return Console.log("You can interrupt this operation.")
 *     } else {
 *       return Console.log("This operation cannot be interrupted.")
 *     }
 *   })
 * })
 *
 * // Effect.runPromise(program)
 * // Output: You can interrupt this operation.
 *
 * // Effect.runPromise(program.pipe(Effect.uninterruptible))
 * // Output: This operation cannot be interrupted.
 *
 * ```
 *
 *  @since 2.0.0
 * @category Interruption
 */
export const checkInterruptible: <A, E, R>(f: (isInterruptible: boolean) => Effect<A, E, R>) => Effect<A, E, R> =
  core.checkInterruptible

/**
 * Provides a way to handle timeouts in uninterruptible effects, allowing them
 * to continue in the background while the main control flow proceeds with the
 * timeout error.
 *
 * **Details**
 *
 * The `disconnect` function allows an uninterruptible effect to continue
 * running in the background, while enabling the main control flow to
 * immediately recognize a timeout condition. This is useful when you want to
 * avoid blocking the program due to long-running tasks, especially when those
 * tasks do not need to affect the flow of the rest of the program.
 *
 * Without `disconnect`, an uninterruptible effect will ignore the
 * timeout and continue executing until it completes. The timeout error will
 * only be assessed after the effect finishes, which can cause delays in
 * recognizing a timeout.
 *
 * With `disconnect`, the uninterruptible effect proceeds in the
 * background while the main program flow can immediately handle the timeout
 * error or trigger alternative logic. This enables faster timeout handling
 * without waiting for the completion of the long-running task.
 *
 * @see {@link timeout} for a version that interrupts the effect.
 * @see {@link uninterruptible} for creating an uninterruptible effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const longRunningTask = Effect.gen(function* () {
 *   console.log("Start heavy processing...")
 *   yield* Effect.sleep("5 seconds") // Simulate a long process
 *   console.log("Heavy processing done.")
 *   return "Data processed"
 * })
 *
 * const timedEffect = longRunningTask.pipe(
 *   Effect.uninterruptible,
 *   // Allows the task to finish in the background if it times out
 *   Effect.disconnect,
 *   Effect.timeout("1 second")
 * )
 *
 * // Effect.runPromiseExit(timedEffect).then(console.log)
 * // Output:
 * // Start heavy processing...
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: { _tag: 'TimeoutException' }
 * //   }
 * // }
 * // Heavy processing done.
 * ```
 *
 * @since 2.0.0
 * @category Interruption
 */
export const disconnect: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.disconnect

/**
 * Represents an effect that interrupts the current fiber.
 *
 * **Details**
 *
 * This effect models the explicit interruption of the fiber in which it runs.
 * When executed, it causes the fiber to stop its operation immediately,
 * capturing the interruption details such as the fiber's ID and its start time.
 * The resulting interruption can be observed in the `Exit` type if the effect
 * is run with functions like {@link runPromiseExit}.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   console.log("start")
 *   yield* Effect.sleep("2 seconds")
 *   yield* Effect.interrupt
 *   console.log("done")
 *   return "some result"
 * })
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // start
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Interrupt',
 * //     fiberId: {
 * //       _id: 'FiberId',
 * //       _tag: 'Runtime',
 * //       id: 0,
 * //       startTimeMillis: ...
 * //     }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Interruption
 */
export const interrupt: Effect<never> = core.interrupt

/**
 * @since 2.0.0
 * @category Interruption
 */
export const interruptWith: (fiberId: FiberId.FiberId) => Effect<never> = core.interruptWith

/**
 * Marks an effect as interruptible.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const interruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.interruptible

/**
 * This function behaves like {@link interruptible}, but it also provides a
 * `restore` function. This function can be used to restore the interruptibility
 * of any specific region of code.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const interruptibleMask: <A, E, R>(
  f: (restore: <AX, EX, RX>(effect: Effect<AX, EX, RX>) => Effect<AX, EX, RX>) => Effect<A, E, R>
) => Effect<A, E, R> = core.interruptibleMask

/**
 * Registers a cleanup effect to run when an effect is interrupted.
 *
 * **Details**
 *
 * This function allows you to specify an effect to run when the fiber is
 * interrupted. This effect will be executed when the fiber is interrupted,
 * allowing you to perform cleanup or other actions.
 *
 * @example
 * ```ts
 * // Title: Running a Cleanup Action on Interruption
 * import { Console, Effect } from "effect"
 *
 * // This handler is executed when the fiber is interrupted
 * const handler = Effect.onInterrupt((_fibers) => Console.log("Cleanup completed"))
 *
 * const success = Console.log("Task completed").pipe(Effect.as("some result"), handler)
 *
 * // Effect.runFork(success)
 * // Output:
 * // Task completed
 *
 * const failure = Console.log("Task failed").pipe(Effect.andThen(Effect.fail("some error")), handler)
 *
 * // Effect.runFork(failure)
 * // Output:
 * // Task failed
 *
 * const interruption = Console.log("Task interrupted").pipe(Effect.andThen(Effect.interrupt), handler)
 *
 * // Effect.runFork(interruption)
 * // Output:
 * // Task interrupted
 * // Cleanup completed
 * ```
 *
 * @since 2.0.0
 * @category Interruption
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
 * Marks an effect as uninterruptible.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const uninterruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.uninterruptible

/**
 * This function behaves like {@link uninterruptible}, but it also provides a
 * `restore` function. This function can be used to restore the interruptibility
 * of any specific region of code.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const uninterruptibleMask: <A, E, R>(
  f: (restore: <AX, EX, RX>(effect: Effect<AX, EX, RX>) => Effect<AX, EX, RX>) => Effect<A, E, R>
) => Effect<A, E, R> = core.uninterruptibleMask

/**
 * Transforms a `Predicate` function into an `Effect` returning the input value if the predicate returns `true`
 * or failing with specified error if the predicate fails
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const isPositive = (n: number): boolean => n > 0
 *
 * // succeeds with `1`
 * Effect.liftPredicate(1, isPositive, n => `${n} is not positive`)
 *
 * // fails with `"0 is not positive"`
 * Effect.liftPredicate(0, isPositive, n => `${n} is not positive`)
 * ```
 *
 * @category Condition Checking
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

/**
 * Replaces the value inside an effect with a constant value.
 *
 * **Details**
 *
 * This function allows you to ignore the original value inside an effect and
 * replace it with a constant value.
 *
 * **When to Use**
 *
 * It is useful when you no longer need the value produced by an effect but want
 * to ensure that the effect completes successfully with a specific constant
 * result instead. For instance, you can replace the value produced by a
 * computation with a predefined value, ignoring what was calculated before.
 *
 * @example
 * ```ts
 * // Title: Replacing a Value
 * import { pipe, Effect } from "effect"
 *
 * // Replaces the value 5 with the constant "new value"
 * const program = pipe(Effect.succeed(5), Effect.as("new value"))
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output: "new value"
 * ```
 *
 * @since 2.0.0
 * @category Mapping
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
 * @category Mapping
 * @since 2.0.0
 */
export const asSome: <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R> = effect.asSome

/**
 * This function maps the error value of an `Effect` value to a `Some` value
 * in an `Option` value. If the original `Effect` value succeeds, the returned
 * `Effect` value will also succeed.
 *
 * @category Mapping
 * @since 2.0.0
 */
export const asSomeError: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Option.Option<E>, R> = effect.asSomeError

/**
 * This function maps the success value of an `Effect` value to `void`. If the
 * original `Effect` value succeeds, the returned `Effect` value will also
 * succeed. If the original `Effect` value fails, the returned `Effect` value
 * will fail with the same error.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const asVoid: <A, E, R>(self: Effect<A, E, R>) => Effect<void, E, R> = core.asVoid

/**
 * Swaps the success and error channels of an effect.
 *
 * **Details**
 *
 * This function reverses the flow of an effect by swapping its success and
 * error channels. The success value becomes an error, and the error value
 * becomes a success.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const program = Effect.fail("Oh uh!").pipe(Effect.as(2))
 *
 * //      ┌─── Effect<string, number, never>
 * //      ▼
 * const flipped = Effect.flip(program)
 * ```
 *
 * @since 2.0.0
 * @category Mapping
 */
export const flip: <A, E, R>(self: Effect<A, E, R>) => Effect<E, A, R> = core.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @since 2.0.0
 * @category Mapping
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
 * Transforms the value inside an effect by applying a function to it.
 *
 * **Syntax**
 *
 * ```ts
 * const mappedEffect = pipe(myEffect, Effect.map(transformation))
 * // or
 * const mappedEffect = Effect.map(myEffect, transformation)
 * // or
 * const mappedEffect = myEffect.pipe(Effect.map(transformation))
 * ```
 *
 * **Details**
 *
 * `map` takes a function and applies it to the value contained within an
 * effect, creating a new effect with the transformed value.
 *
 * It's important to note that effects are immutable, meaning that the original
 * effect is not modified. Instead, a new effect is returned with the updated
 * value.
 *
 * @see {@link mapError} for a version that operates on the error channel.
 * @see {@link mapBoth} for a version that operates on both channels.
 * @see {@link flatMap} or {@link andThen} for a version that can return a new effect.
 *
 * @example
 * ```ts
 * // Title: Adding a Service Charge
 * import { pipe, Effect } from "effect"
 *
 * const addServiceCharge = (amount: number) => amount + 1
 *
 * const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
 *
 * const finalAmount = pipe(
 *   fetchTransactionAmount,
 *   Effect.map(addServiceCharge)
 * )
 *
 * // Effect.runPromise(finalAmount).then(console.log)
 * // Output: 101
 * ```
 * @since 2.0.0
 * @category Mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Effect<A, E, R>) => Effect<B, E, R>
  <A, E, R, B>(self: Effect<A, E, R>, f: (a: A) => B): Effect<B, E, R>
} = core.map

/**
 * Applies a stateful transformation to each element of a collection, producing
 * new elements along with an updated state.
 *
 * **When to Use**
 *
 * Use `mapAccum` when you need to process each element of a collection while
 * keeping track of some state across iterations.
 *
 * **Details**
 *
 * `mapAccum` takes an initial state (`initial`) and a function (`f`) that is
 * applied to each element. This function returns a new state and a transformed
 * element. The final effect produces both the accumulated state and the
 * transformed collection.
 *
 * If the input collection is a non-empty array, the return type will match the
 * input collection type.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * // Define an initial state and a transformation function
 * const initialState = 0
 *
 * const transformation = (state: number, element: string) =>
 *   Effect.succeed<[number, string]>([state + element.length, element.toUpperCase()])
 *
 * // Apply mapAccum to transform an array of strings
 * const program = Effect.mapAccum(["a", "bb", "ccc"], initialState, transformation)
 *
 * // Effect.runPromise(program).then(([finalState, transformedCollection]) => {
 * //   console.log(finalState)
 * //   console.log(transformedCollection)
 * // })
 * // Output:
 * // 6
 * // [ 'A', 'BB', 'CCC' ]
 * ```
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapAccum: {
  <S, A, B, E, R, I extends Iterable<A> = Iterable<A>>(
    initial: S,
    f: (state: S, a: RA.ReadonlyArray.Infer<I>, i: number) => Effect<readonly [S, B], E, R>
  ): (elements: I) => Effect<[S, RA.ReadonlyArray.With<I, B>], E, R>
  <A, S, B, E, R, I extends Iterable<A> = Iterable<A>>(
    elements: I,
    initial: S,
    f: (state: S, a: RA.ReadonlyArray.Infer<I>, i: number) => Effect<readonly [S, B], E, R>
  ): Effect<[S, RA.ReadonlyArray.With<I, B>], E, R>
} = effect.mapAccum

/**
 * Applies transformations to both the success and error channels of an effect.
 *
 * **Details**
 *
 * This function takes two map functions as arguments: one for the error channel
 * and one for the success channel. You can use it when you want to modify both
 * the error and the success values without altering the overall success or
 * failure status of the effect.
 *
 * @see {@link map} for a version that operates on the success channel.
 * @see {@link mapError} for a version that operates on the error channel.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))
 *
 * //      ┌─── Effect<boolean, Error, never>
 * //      ▼
 * const modified = Effect.mapBoth(simulatedTask, {
 *   onFailure: (message) => new Error(message),
 *   onSuccess: (n) => n > 0
 * })
 * ```
 *
 * @since 2.0.0
 * @category Mapping
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
 * Transforms or modifies the error produced by an effect without affecting its
 * success value.
 *
 * **When to Use**
 *
 * This function is helpful when you want to enhance the error with additional
 * information, change the error type, or apply custom error handling while
 * keeping the original behavior of the effect's success values intact. It only
 * operates on the error channel and leaves the success channel unchanged.
 *
 * @see {@link map} for a version that operates on the success channel.
 * @see {@link mapBoth} for a version that operates on both channels.
 * @see {@link orElseFail} if you want to replace the error with a new one.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const simulatedTask = Effect.fail("Oh no!").pipe(Effect.as(1))
 *
 * //      ┌─── Effect<number, Error, never>
 * //      ▼
 * const mapped = Effect.mapError(
 *   simulatedTask,
 *   (message) => new Error(message)
 * )
 * ```
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (e: E) => E2): Effect<A, E2, R>
} = core.mapError

/**
 * Maps the cause of failure of an effect using a specified function.
 *
 * @see {@link sandbox} for a version that exposes the full cause of failures, defects, or interruptions.
 * @see {@link catchAllCause} for a version that can recover from all types of defects.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<A, E2, R>
} = effect.mapErrorCause

/**
 * Combines both success and error channels of an effect into a single outcome.
 *
 * **Details**
 *
 * This function transforms an effect that may fail into one that always returns
 * a value, where both success and failure outcomes are handled as values in the
 * success channel.
 *
 * **When to Use**
 *
 * This can be useful when you want to continue execution regardless of the
 * error type and still capture both successful results and errors as part of
 * the outcome.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const program = Effect.fail("Oh uh!").pipe(Effect.as(2))
 *
 * //      ┌─── Effect<number | string, never, never>
 * //      ▼
 * const recovered = Effect.merge(program)
 * ```
 *
 * @since 2.0.0
 * @category Mapping
 */
export const merge: <A, E, R>(self: Effect<A, E, R>) => Effect<E | A, never, R> = effect.merge

/**
 * Returns a new effect with the boolean value of this effect negated.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const negate: <E, R>(self: Effect<boolean, E, R>) => Effect<boolean, E, R> = effect.negate

/**
 * Creates a scoped resource using an `acquire` and `release` effect.
 *
 * **Details**
 *
 * This function helps manage resources by combining two `Effect` values: one
 * for acquiring the resource and one for releasing it.
 *
 * `acquireRelease` does the following:
 *
 *   1. Ensures that the effect that acquires the resource will not be
 *      interrupted. Note that acquisition may still fail due to internal
 *      reasons (such as an uncaught exception).
 *   2. Ensures that the `release` effect will not be interrupted, and will be
 *      executed as long as the acquisition effect successfully acquires the
 *      resource.
 *
 * If the `acquire` function succeeds, the `release` function is added to the
 * list of finalizers for the scope. This ensures that the release will happen
 * automatically when the scope is closed.
 *
 * Both `acquire` and `release` run uninterruptibly, meaning they cannot be
 * interrupted while they are executing.
 *
 * Additionally, the `release` function can be influenced by the exit value when
 * the scope closes, allowing for custom handling of how the resource is
 * released based on the execution outcome.
 *
 * **When to Use**
 *
 * This function is used to ensure that an effect that represents the
 * acquisition of a resource (for example, opening a file, launching a thread,
 * etc.) will not be interrupted, and that the resource will always be released
 * when the `Effect` completes execution.
 *
 * @see {@link acquireUseRelease} for a version that automatically handles the scoping of resources.
 *
 * @example
 * ```ts
 * // Title: Defining a Simple Resource
 * import { Effect } from "effect"
 *
 * // Define an interface for a resource
 * interface MyResource {
 *   readonly contents: string
 *   readonly close: () => Promise<void>
 * }
 *
 * // Simulate resource acquisition
 * const getMyResource = (): Promise<MyResource> =>
 *   Promise.resolve({
 *     contents: "lorem ipsum",
 *     close: () =>
 *       new Promise((resolve) => {
 *         console.log("Resource released")
 *         resolve()
 *       })
 *   })
 *
 * // Define how the resource is acquired
 * const acquire = Effect.tryPromise({
 *   try: () =>
 *     getMyResource().then((res) => {
 *       console.log("Resource acquired")
 *       return res
 *     }),
 *   catch: () => new Error("getMyResourceError")
 * })
 *
 * // Define how the resource is released
 * const release = (res: MyResource) => Effect.promise(() => res.close())
 *
 * // Create the resource management workflow
 * //
 * //      ┌─── Effect<MyResource, Error, Scope>
 * //      ▼
 * const resource = Effect.acquireRelease(acquire, release)
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Creates a scoped resource with an interruptible acquire action.
 *
 * **Details**
 *
 * This function is similar to {@link acquireRelease}, but it allows the
 * acquisition of the resource to be interrupted. The `acquire` effect, which
 * represents the process of obtaining the resource, can be interrupted if
 * necessary.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Creates a scoped resource and automatically handles the use effect during the
 * scope.
 *
 * **Details**
 *
 * This function is similar to {@link acquireRelease}, but it introduces an
 * additional `use` effect. This allows you to automatically execute the `use`
 * effect while the resource is acquired, and it also ensures that the `release`
 * effect is performed when the scope is closed.
 *
 * The `acquire` effect is used to obtain the resource, the `use` effect
 * operates while the resource is in use, and the `release` effect cleans up the
 * resource when the scope ends.
 *
 * @example
 * ```ts
 * // Title: Automatically Managing Resource Lifetime
 * import { Effect, Console } from "effect"
 *
 * // Define an interface for a resource
 * interface MyResource {
 *   readonly contents: string
 *   readonly close: () => Promise<void>
 * }
 *
 * // Simulate resource acquisition
 * const getMyResource = (): Promise<MyResource> =>
 *   Promise.resolve({
 *     contents: "lorem ipsum",
 *     close: () =>
 *       new Promise((resolve) => {
 *         console.log("Resource released")
 *         resolve()
 *       })
 *   })
 *
 * // Define how the resource is acquired
 * const acquire = Effect.tryPromise({
 *   try: () =>
 *     getMyResource().then((res) => {
 *       console.log("Resource acquired")
 *       return res
 *     }),
 *   catch: () => new Error("getMyResourceError")
 * })
 *
 * // Define how the resource is released
 * const release = (res: MyResource) => Effect.promise(() => res.close())
 *
 * const use = (res: MyResource) => Console.log(`content is ${res.contents}`)
 *
 * //      ┌─── Effect<void, Error, never>
 * //      ▼
 * const program = Effect.acquireUseRelease(acquire, use, release)
 *
 * // Effect.runPromise(program)
 * // Output:
 * // Resource acquired
 * // content is lorem ipsum
 * // Resource released
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Ensures a finalizer is added to the scope of the calling effect, guaranteeing
 * it runs when the scope is closed.
 *
 * **Details**
 *
 * This function adds a finalizer that will execute whenever the scope of the
 * effect is closed, regardless of whether the effect succeeds, fails, or is
 * interrupted. The finalizer receives the `Exit` value of the effect's scope,
 * allowing it to react differently depending on how the effect concludes.
 *
 * Finalizers are a reliable way to manage resource cleanup, ensuring that
 * resources such as file handles, network connections, or database transactions
 * are properly closed even in the event of an unexpected interruption or error.
 *
 * Finalizers operate in conjunction with Effect's scoped resources. If an
 * effect with a finalizer is wrapped in a scope, the finalizer will execute
 * automatically when the scope ends.
 *
 * @see {@link onExit} for attaching a finalizer directly to an effect.
 *
 * @example
 * ```ts
 * // Title: Adding a Finalizer on Success
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<string, never, Scope>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   yield* Effect.addFinalizer((exit) =>
 *     Console.log(`Finalizer executed. Exit status: ${exit._tag}`)
 *   )
 *   return "some result"
 * })
 *
 * // Wrapping the effect in a scope
 * //
 * //      ┌─── Effect<string, never, never>
 * //      ▼
 * const runnable = Effect.scoped(program)
 *
 * // Effect.runPromiseExit(runnable).then(console.log)
 * // Output:
 * // Finalizer executed. Exit status: Success
 * // { _id: 'Exit', _tag: 'Success', value: 'some result' }
 * ```
 *
 * @example
 * ```ts
 * // Title: Adding a Finalizer on Failure
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<never, string, Scope>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   yield* Effect.addFinalizer((exit) =>
 *     Console.log(`Finalizer executed. Exit status: ${exit._tag}`)
 *   )
 *   return yield* Effect.fail("Uh oh!")
 * })
 *
 * // Wrapping the effect in a scope
 * //
 * //      ┌─── Effect<never, string, never>
 * //      ▼
 * const runnable = Effect.scoped(program)
 *
 * // Effect.runPromiseExit(runnable).then(console.log)
 * // Output:
 * // Finalizer executed. Exit status: Failure
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'Uh oh!' }
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Title: Adding a Finalizer on Interruption
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<never, never, Scope>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   yield* Effect.addFinalizer((exit) =>
 *     Console.log(`Finalizer executed. Exit status: ${exit._tag}`)
 *   )
 *   return yield* Effect.interrupt
 * })
 *
 * // Wrapping the effect in a scope
 * //
 * //      ┌─── Effect<never, never, never>
 * //      ▼
 * const runnable = Effect.scoped(program)
 *
 * // Effect.runPromiseExit(runnable).then(console.log)
 * // Output:
 * // Finalizer executed. Exit status: Failure
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Interrupt',
 * //     fiberId: {
 * //       _id: 'FiberId',
 * //       _tag: 'Runtime',
 * //       id: 0,
 * //       startTimeMillis: ...
 * //     }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const addFinalizer: <X, R>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect<X, never, R>
) => Effect<void, never, Scope.Scope | R> = fiberRuntime.addFinalizer

/**
 * Guarantees the execution of a finalizer when an effect starts execution.
 *
 * **Details**
 *
 * This function allows you to specify a `finalizer` effect that will always be
 * run once the effect starts execution, regardless of whether the effect
 * succeeds, fails, or is interrupted.
 *
 * **When to Use**
 *
 * This is useful when you need to ensure that certain cleanup or final steps
 * are executed in all cases, such as releasing resources or performing
 * necessary logging.
 *
 * While this function provides strong guarantees about executing the finalizer,
 * it is considered a low-level tool, which may not be ideal for more complex
 * resource management. For higher-level resource management with automatic
 * acquisition and release, see the {@link acquireRelease} family of functions.
 * For use cases where you need access to the result of an effect, consider
 * using {@link onExit}.
 *
 * @see {@link onExit} for a version that provides access to the result of an
 * effect.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const handler = Effect.ensuring(Console.log("Cleanup completed"))
 *
 * const success = Console.log("Task completed").pipe(Effect.as("some result"), handler)
 *
 * // Effect.runFork(success)
 * // Output:
 * // Task completed
 * // Cleanup completed
 *
 * const failure = Console.log("Task failed").pipe(Effect.andThen(Effect.fail("some error")), handler)
 *
 * // Effect.runFork(failure)
 * // Output:
 * // Task failed
 * // Cleanup completed
 *
 * const interruption = Console.log("Task interrupted").pipe(Effect.andThen(Effect.interrupt), handler)
 *
 * // Effect.runFork(interruption)
 * // Output:
 * // Task interrupted
 * // Cleanup completed
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const ensuring: {
  <X, R1>(finalizer: Effect<X, never, R1>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R1 | R>
  <A, E, R, X, R1>(self: Effect<A, E, R>, finalizer: Effect<X, never, R1>): Effect<A, E, R1 | R>
} = fiberRuntime.ensuring

/**
 * Ensures a cleanup effect runs whenever the calling effect fails, providing
 * the failure cause to the cleanup effect.
 *
 * **Details**
 *
 * This function allows you to attach a cleanup effect that runs whenever the
 * calling effect fails. The cleanup effect receives the cause of the failure,
 * allowing you to perform actions such as logging, releasing resources, or
 * executing additional recovery logic based on the error. The cleanup effect
 * will execute even if the failure is due to interruption.
 *
 * Importantly, the cleanup effect itself is uninterruptible, ensuring that it
 * completes regardless of external interruptions.
 *
 * @see {@link ensuring} for attaching a cleanup effect that runs on both success and failure.
 * @see {@link onExit} for attaching a cleanup effect that runs on all possible exits.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * // This handler logs the failure cause when the effect fails
 * const handler = Effect.onError((cause) => Console.log(`Cleanup completed: ${cause}`))
 *
 * const success = Console.log("Task completed").pipe(Effect.as("some result"), handler)
 *
 * // Effect.runFork(success)
 * // Output:
 * // Task completed
 *
 * const failure = Console.log("Task failed").pipe(Effect.andThen(Effect.fail("some error")), handler)
 *
 * // Effect.runFork(failure)
 * // Output:
 * // Task failed
 * // Cleanup completed: Error: some error
 *
 * const interruption = Console.log("Task interrupted").pipe(Effect.andThen(Effect.interrupt), handler)
 *
 * // Effect.runFork(interruption)
 * // Output:
 * // Task interrupted
 * // Cleanup completed: All fibers interrupted without errors.
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Guarantees that a cleanup function runs regardless of whether the effect
 * succeeds, fails, or is interrupted.
 *
 * **Details**
 *
 * This function ensures that a provided cleanup function is executed after the
 * effect completes, regardless of the outcome. The cleanup function is given
 * the `Exit` value of the effect, which provides detailed information about the
 * result:
 * - If the effect succeeds, the `Exit` contains the success value.
 * - If the effect fails, the `Exit` contains the error or failure cause.
 * - If the effect is interrupted, the `Exit` reflects the interruption.
 *
 * The cleanup function is guaranteed to run uninterruptibly, ensuring reliable
 * resource management even in complex or high-concurrency scenarios.
 *
 * @example
 * ```ts
 * import { Console, Effect, Exit } from "effect"
 *
 * // Define a cleanup function that logs the outcome of the effect
 * const handler = Effect.onExit((exit) => Console.log(`Cleanup completed: ${Exit.getOrElse(exit, String)}`))
 *
 * const success = Console.log("Task completed").pipe(Effect.as("some result"), handler)
 *
 * // Effect.runFork(success)
 * // Output:
 * // Task completed
 * // Cleanup completed: some result
 *
 * const failure = Console.log("Task failed").pipe(Effect.andThen(Effect.fail("some error")), handler)
 *
 * // Effect.runFork(failure)
 * // Output:
 * // Task failed
 * // Cleanup completed: Error: some error
 *
 * const interruption = Console.log("Task interrupted").pipe(Effect.andThen(Effect.interrupt), handler)
 *
 * // Effect.runFork(interruption)
 * // Output:
 * // Task interrupted
 * // Cleanup completed: All fibers interrupted without errors.
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Ensures that finalizers are run concurrently when the scope of an effect is
 * closed.
 *
 * **Details**
 *
 * This function modifies the behavior of finalizers within a scoped workflow to
 * allow them to run concurrently when the scope is closed.
 *
 * By default, finalizers are executed sequentially in reverse order of their
 * addition, but this function changes that behavior to execute all finalizers
 * concurrently.
 *
 * **When to Use**
 *
 * Running finalizers concurrently can improve performance when multiple
 * independent cleanup tasks need to be performed. However, it requires that
 * these tasks do not depend on the order of execution or introduce race
 * conditions.
 *
 * @see {@link sequentialFinalizers} for a version that ensures finalizers are run sequentially.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * // Define a program that adds multiple finalizers
 * const program = Effect.gen(function*() {
 *   yield* Effect.addFinalizer(() => Console.log("Finalizer 1 executed").pipe(Effect.delay("300 millis")))
 *   yield* Effect.addFinalizer(() => Console.log("Finalizer 2 executed").pipe(Effect.delay("100 millis")))
 *   yield* Effect.addFinalizer(() => Console.log("Finalizer 3 executed").pipe(Effect.delay("200 millis")))
 *   return "some result"
 * })
 *
 * // Modify the program to ensure finalizers run in parallel
 * const modified = program.pipe(Effect.parallelFinalizers)
 *
 * const runnable = Effect.scoped(modified)
 *
 * // Effect.runFork(runnable)
 * // Output:
 * // Finalizer 2 executed
 * // Finalizer 3 executed
 * // Finalizer 1 executed
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const parallelFinalizers: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.parallelFinalizers

/**
 * Ensures that finalizers are run sequentially in reverse order of their
 * addition.
 *
 * **Details**
 *
 * This function modifies the behavior of finalizers within a scoped workflow to
 * ensure they are run sequentially in reverse order when the scope is closed.
 *
 * By default, finalizers are executed sequentially, so this only changes the
 * behavior if the scope is configured to run finalizers concurrently.
 *
 * @see {@link parallelFinalizers} for a version that ensures finalizers are run concurrently.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const sequentialFinalizers: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> =
  fiberRuntime.sequentialFinalizers

/**
 * Applies a custom execution strategy to finalizers within a scoped workflow.
 *
 * **Details**
 *
 * This function allows you to control how finalizers are executed in a scope by
 * applying a specified `ExecutionStrategy`. The `strategy` can dictate whether
 * finalizers run (e.g., sequentially or in parallel).
 *
 * Additionally, the function provides a `restore` operation, which ensures that
 * the effect passed to it is executed under the default execution strategy.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const finalizersMask: (
  strategy: ExecutionStrategy
) => <A, E, R>(
  self: (restore: <A1, E1, R1>(self: Effect<A1, E1, R1>) => Effect<A1, E1, R1>) => Effect<A, E, R>
) => Effect<A, E, R> = fiberRuntime.finalizersMask

/**
 * Provides access to the current scope in a scoped workflow.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const scope: Effect<Scope.Scope, never, Scope.Scope> = fiberRuntime.scope

/**
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const scopeWith: <A, E, R>(f: (scope: Scope.Scope) => Effect<A, E, R>) => Effect<A, E, R | Scope.Scope> =
  fiberRuntime.scopeWith

/**
 * Creates a `Scope`, passes it to the specified effectful function, and closes
 * the scope when the effect completes (whether through success, failure, or
 * interruption).
 *
 * @since 3.11.0
 * @category Scoping, Resources & Finalization
 */
export const scopedWith: <A, E, R>(f: (scope: Scope.Scope) => Effect<A, E, R>) => Effect<A, E, R> =
  fiberRuntime.scopedWith

/**
 * Scopes all resources used in an effect to the lifetime of the effect.
 *
 * **Details**
 *
 * This function ensures that all resources used within an effect are tied to
 * its lifetime. Finalizers for these resources are executed automatically when
 * the effect completes, whether through success, failure, or interruption. This
 * guarantees proper resource cleanup without requiring explicit management.
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const scoped: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, Exclude<R, Scope.Scope>> =
  fiberRuntime.scopedEffect

/**
 * Scopes all resources acquired by one effect to the lifetime of another
 * effect.
 *
 * **Details**
 *
 * This function allows you to scope the resources acquired by one effect
 * (`self`) to the lifetime of another effect (`use`). This ensures that the
 * resources are cleaned up as soon as the `use` effect completes, regardless of
 * how the `use` effect ends (success, failure, or interruption).
 *
 * @see {@link scopedWith} Manage scoped operations with a temporary scope.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const acquire = Console.log("Acquiring resource").pipe(
 *   Effect.as(1),
 *   Effect.tap(Effect.addFinalizer(() => Console.log("Releasing resource")))
 * )
 * const use = (resource: number) => Console.log(`Using resource: ${resource}`)
 *
 * const program = acquire.pipe(Effect.using(use))
 *
 * // Effect.runFork(program)
 * // Output:
 * // Acquiring resource
 * // Using resource: 1
 * // Releasing resource
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
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
 * Returns the result of the effect and a finalizer to close its scope.
 *
 * **Details**
 *
 * This function allows you to retrieve both the result of an effect and a
 * finalizer that can be used to manually close its scope. This is useful for
 * workflows where you need early access to the result while retaining control
 * over the resource cleanup process.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const acquire = Console.log("Acquiring resource").pipe(
 *   Effect.as(1),
 *   Effect.tap(Effect.addFinalizer(() => Console.log("Releasing resource")))
 * )
 * const program = Effect.gen(function*() {
 *   const [finalizer, resource] = yield* Effect.withEarlyRelease(acquire)
 *   console.log(`Using resource: ${resource}`)
 *   yield* Effect.sleep("1 second")
 *   yield* finalizer
 * })
 *
 * Effect.runFork(program.pipe(Effect.scoped))
 * // Output:
 * // Acquiring resource
 * // Using resource: 1
 * // Releasing resource
 * ```
 *
 * @since 2.0.0
 * @category Scoping, Resources & Finalization
 */
export const withEarlyRelease: <A, E, R>(
  self: Effect<A, E, R>
) => Effect<[finalizer: Effect<void>, result: A], E, R | Scope.Scope> = fiberRuntime.withEarlyRelease

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const awaitAllChildren: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = circular.awaitAllChildren

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const daemonChildren: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.daemonChildren

/**
 * Constructs an effect with information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const descriptor: Effect<Fiber.Fiber.Descriptor> = effect.descriptor

/**
 * Constructs an effect based on information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const descriptorWith: <A, E, R>(f: (descriptor: Fiber.Fiber.Descriptor) => Effect<A, E, R>) => Effect<A, E, R> =
  effect.descriptorWith

/**
 * Returns a new workflow that executes this one and captures the changes in
 * `FiberRef` values.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
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
 * @category Supervision & Fibers
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
 * @category Supervision & Fibers
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
 * @category Supervision & Fibers
 */
export const fiberId: Effect<FiberId.FiberId> = core.fiberId

/**
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const fiberIdWith: <A, E, R>(f: (descriptor: FiberId.Runtime) => Effect<A, E, R>) => Effect<A, E, R> =
  core.fiberIdWith

/**
 * Creates a new fiber to run an effect concurrently.
 *
 * **Details**
 *
 * This function takes an effect and forks it into a separate fiber, allowing it
 * to run concurrently without blocking the original effect. The new fiber
 * starts execution immediately after being created, and the fiber object is
 * returned immediately without waiting for the effect to begin. This is useful
 * when you want to run tasks concurrently while continuing other tasks in the
 * parent fiber.
 *
 * The forked fiber is attached to the parent fiber's scope. This means that
 * when the parent fiber terminates, the child fiber will also be terminated
 * automatically. This feature, known as "auto supervision," ensures that no
 * fibers are left running unintentionally. If you prefer not to have this auto
 * supervision behavior, you can use {@link forkDaemon} or {@link forkIn}.
 *
 * **When to Use**
 *
 * Use this function when you need to run an effect concurrently without
 * blocking the current execution flow. For example, you might use it to launch
 * background tasks or concurrent computations. However, working with fibers can
 * be complex, so before using this function directly, you might want to explore
 * higher-level functions like {@link raceWith}, {@link zip}, or others that can
 * manage concurrency for you.
 *
 * @see {@link forkWithErrorHandler} for a version that allows you to handle errors.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const fib = (n: number): Effect.Effect<number> =>
 *   n < 2
 *     ? Effect.succeed(n)
 *     : Effect.zipWith(fib(n - 1), fib(n - 2), (a, b) => a + b)
 *
 * //      ┌─── Effect<RuntimeFiber<number, never>, never, never>
 * //      ▼
 * const fib10Fiber = Effect.fork(fib(10))
 * ```
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const fork: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R> = fiberRuntime.fork

/**
 * Creates a long-running background fiber that is independent of its parent.
 *
 * **Details**
 *
 * This function creates a "daemon" fiber that runs in the background and is not
 * tied to the lifecycle of its parent fiber. Unlike normal fibers that stop
 * when the parent fiber terminates, a daemon fiber will continue running until
 * the global scope closes or the fiber completes naturally. This makes it
 * useful for tasks that need to run in the background independently, such as
 * periodic logging, monitoring, or background data processing.
 *
 * @example
 * ```ts
 * // Title: Creating a Daemon Fibe
 * import { Effect, Console, Schedule } from "effect"
 *
 * // Daemon fiber that logs a message repeatedly every second
 * const daemon = Effect.repeat(
 *   Console.log("daemon: still running!"),
 *   Schedule.fixed("1 second")
 * )
 *
 * const parent = Effect.gen(function* () {
 *   console.log("parent: started!")
 *   // Daemon fiber running independently
 *   yield* Effect.forkDaemon(daemon)
 *   yield* Effect.sleep("3 seconds")
 *   console.log("parent: finished!")
 * })
 *
 * // Effect.runFork(parent)
 * // Output:
 * // parent: started!
 * // daemon: still running!
 * // daemon: still running!
 * // daemon: still running!
 * // parent: finished!
 * // daemon: still running!
 * // daemon: still running!
 * // daemon: still running!
 * // daemon: still running!
 * // daemon: still running!
 * // ...etc...
 * ```
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const forkDaemon: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R> =
  fiberRuntime.forkDaemon

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
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
 * Forks an effect in a specific scope, allowing finer control over its
 * execution.
 *
 * **Details**
 *
 * There are some cases where we need more fine-grained control, so we want to
 * fork a fiber in a specific scope. We can use the `Effect.forkIn` operator
 * which takes the target scope as an argument.
 *
 * The fiber will be interrupted when the scope is closed.
 *
 * @example
 * ```ts
 * // Title: Forking a Fiber in a Specific Scope
 * //
 * // In this example, the child fiber is forked into the outerScope,
 * // allowing it to outlive the inner scope but still be terminated
 * // when the outerScope is closed.
 * //
 *
 * import { Console, Effect, Schedule } from "effect"
 *
 * // Child fiber that logs a message repeatedly every second
 * const child = Effect.repeat(
 *   Console.log("child: still running!"),
 *   Schedule.fixed("1 second")
 * )
 *
 * const program = Effect.scoped(
 *   Effect.gen(function* () {
 *     yield* Effect.addFinalizer(() =>
 *       Console.log("The outer scope is about to be closed!")
 *     )
 *
 *     // Capture the outer scope
 *     const outerScope = yield* Effect.scope
 *
 *     // Create an inner scope
 *     yield* Effect.scoped(
 *       Effect.gen(function* () {
 *         yield* Effect.addFinalizer(() =>
 *           Console.log("The inner scope is about to be closed!")
 *         )
 *         // Fork the child fiber in the outer scope
 *         yield* Effect.forkIn(child, outerScope)
 *         yield* Effect.sleep("3 seconds")
 *       })
 *     )
 *
 *     yield* Effect.sleep("5 seconds")
 *   })
 * )
 *
 * // Effect.runFork(program)
 * // Output:
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // The inner scope is about to be closed!
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // The outer scope is about to be closed!
 * ```
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const forkIn: {
  (scope: Scope.Scope): <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, R>
  <A, E, R>(self: Effect<A, E, R>, scope: Scope.Scope): Effect<Fiber.RuntimeFiber<A, E>, never, R>
} = circular.forkIn

/**
 * Forks a fiber in a local scope, ensuring it outlives its parent.
 *
 * **Details**
 *
 * This function is used to create fibers that are tied to a local scope,
 * meaning they are not dependent on their parent fiber's lifecycle. Instead,
 * they will continue running until the scope they were created in is closed.
 * This is particularly useful when you need a fiber to run independently of the
 * parent fiber, but still want it to be terminated when the scope ends.
 *
 * Fibers created with this function are isolated from the parent fiber’s
 * termination, so they can run for a longer period. This behavior is different
 * from fibers created with {@link fork}, which are terminated when the parent fiber
 * terminates. With `forkScoped`, the child fiber will keep running until the
 * local scope ends, regardless of the state of the parent fiber.
 *
 * @example
 * ```ts
 * // Title: Forking a Fiber in a Local Scope
 * //
 * // In this example, the child fiber continues to run beyond the lifetime of the parent fiber.
 * // The child fiber is tied to the local scope and will be terminated only when the scope ends.
 * //
 *
 * import { Effect, Console, Schedule } from "effect"
 *
 * // Child fiber that logs a message repeatedly every second
 * const child = Effect.repeat(
 *   Console.log("child: still running!"),
 *   Schedule.fixed("1 second")
 * )
 *
 * //      ┌─── Effect<void, never, Scope>
 * //      ▼
 * const parent = Effect.gen(function* () {
 *   console.log("parent: started!")
 *   // Child fiber attached to local scope
 *   yield* Effect.forkScoped(child)
 *   yield* Effect.sleep("3 seconds")
 *   console.log("parent: finished!")
 * })
 *
 * // Program runs within a local scope
 * const program = Effect.scoped(
 *   Effect.gen(function* () {
 *     console.log("Local scope started!")
 *     yield* Effect.fork(parent)
 *     // Scope lasts for 5 seconds
 *     yield* Effect.sleep("5 seconds")
 *     console.log("Leaving the local scope!")
 *   })
 * )
 *
 * // Effect.runFork(program)
 * // Output:
 * // Local scope started!
 * // parent: started!
 * // child: still running!
 * // child: still running!
 * // child: still running!
 * // parent: finished!
 * // child: still running!
 * // child: still running!
 * // Leaving the local scope!
 * ```
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const forkScoped: <A, E, R>(self: Effect<A, E, R>) => Effect<Fiber.RuntimeFiber<A, E>, never, Scope.Scope | R> =
  circular.forkScoped

/**
 * Like {@link fork} but handles an error with the provided handler.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
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
 * @see {@link fromFiberEffect} for creating an effect from a fiber obtained from an effect.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const fromFiber: <A, E>(fiber: Fiber.Fiber<A, E>) => Effect<A, E> = circular.fromFiber

/**
 * Creates an `Effect` value that represents the exit value of a fiber obtained
 * from an effect.
 *
 * @see {@link fromFiber} for creating an effect from a fiber.
 *
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const fromFiberEffect: <A, E, R>(fiber: Effect<Fiber.Fiber<A, E>, E, R>) => Effect<A, E, R> =
  circular.fromFiberEffect

/**
 * Supervises child fibers by reporting them to a specified supervisor.
 *
 * **Details**
 *
 * This function takes a supervisor as an argument and returns an effect where
 * all child fibers forked within it are supervised by the provided supervisor.
 * This enables you to capture detailed information about these child fibers,
 * such as their status, through the supervisor.
 *
 * @example
 * ```ts
 * // Title: Monitoring Fiber Count
 * import { Effect, Supervisor, Schedule, Fiber, FiberStatus } from "effect"
 *
 * // Main program that monitors fibers while calculating a Fibonacci number
 * const program = Effect.gen(function* () {
 *   // Create a supervisor to track child fibers
 *   const supervisor = yield* Supervisor.track
 *
 *   // Start a Fibonacci calculation, supervised by the supervisor
 *   const fibFiber = yield* fib(20).pipe(
 *     Effect.supervised(supervisor),
 *     // Fork the Fibonacci effect into a fiber
 *     Effect.fork
 *   )
 *
 *   // Define a schedule to periodically monitor the fiber count every 500ms
 *   const policy = Schedule.spaced("500 millis").pipe(
 *     Schedule.whileInputEffect((_) =>
 *       Fiber.status(fibFiber).pipe(
 *         // Continue while the Fibonacci fiber is not done
 *         Effect.andThen((status) => status !== FiberStatus.done)
 *       )
 *     )
 *   )
 *
 *   // Start monitoring the fibers, using the supervisor to track the count
 *   const monitorFiber = yield* monitorFibers(supervisor).pipe(
 *     // Repeat the monitoring according to the schedule
 *     Effect.repeat(policy),
 *     // Fork the monitoring into its own fiber
 *     Effect.fork
 *   )
 *
 *   // Join the monitor and Fibonacci fibers to ensure they complete
 *   yield* Fiber.join(monitorFiber)
 *   const result = yield* Fiber.join(fibFiber)
 *
 *   console.log(`fibonacci result: ${result}`)
 * })
 *
 * // Function to monitor and log the number of active fibers
 * const monitorFibers = (
 *   supervisor: Supervisor.Supervisor<Array<Fiber.RuntimeFiber<any, any>>>
 * ): Effect.Effect<void> =>
 *   Effect.gen(function* () {
 *     const fibers = yield* supervisor.value // Get the current set of fibers
 *     console.log(`number of fibers: ${fibers.length}`)
 *   })
 *
 * // Recursive Fibonacci calculation, spawning fibers for each recursive step
 * const fib = (n: number): Effect.Effect<number> =>
 *   Effect.gen(function* () {
 *     if (n <= 1) {
 *       return 1
 *     }
 *     yield* Effect.sleep("500 millis") // Simulate work by delaying
 *
 *     // Fork two fibers for the recursive Fibonacci calls
 *     const fiber1 = yield* Effect.fork(fib(n - 2))
 *     const fiber2 = yield* Effect.fork(fib(n - 1))
 *
 *     // Join the fibers to retrieve their results
 *     const v1 = yield* Fiber.join(fiber1)
 *     const v2 = yield* Fiber.join(fiber2)
 *
 *     return v1 + v2 // Combine the results
 *   })
 *
 * // Effect.runPromise(program)
 * // Output:
 * // number of fibers: 0
 * // number of fibers: 2
 * // number of fibers: 6
 * // number of fibers: 14
 * // number of fibers: 30
 * // number of fibers: 62
 * // number of fibers: 126
 * // number of fibers: 254
 * // number of fibers: 510
 * // number of fibers: 1022
 * // number of fibers: 2034
 * // number of fibers: 3795
 * // number of fibers: 5810
 * // number of fibers: 6474
 * // number of fibers: 4942
 * // number of fibers: 2515
 * // number of fibers: 832
 * // number of fibers: 170
 * // number of fibers: 18
 * // number of fibers: 0
 * // fibonacci result: 10946
 * ```
 *
 * @since 2.0.0
 * @category Supervision & Fibers
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
 * @category Supervision & Fibers
 */
export const transplant: <A, E, R>(
  f: (grafter: <A2, E2, R2>(effect: Effect<A2, E2, R2>) => Effect<A2, E2, R2>) => Effect<A, E, R>
) => Effect<A, E, R> = core.transplant

/**
 * @since 2.0.0
 * @category Supervision & Fibers
 */
export const withConcurrency: {
  (concurrency: number | "unbounded"): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, concurrency: number | "unbounded"): Effect<A, E, R>
} = core.withConcurrency

/**
 * Sets the provided scheduler for usage in the wrapped effect
 *
 * @since 2.0.0
 * @category Scheduler
 */
export const withScheduler: {
  (scheduler: Scheduler.Scheduler): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, scheduler: Scheduler.Scheduler): Effect<A, E, R>
} = Scheduler.withScheduler

/**
 * Sets the scheduling priority used when yielding
 *
 * @since 2.0.0
 * @category Scheduler
 */
export const withSchedulingPriority: {
  (priority: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, priority: number): Effect<A, E, R>
} = core.withSchedulingPriority

/**
 * Sets the maximum number of operations before yield by the default schedulers
 *
 * @since 2.0.0
 * @category Scheduler
 */
export const withMaxOpsBeforeYield: {
  (priority: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, priority: number): Effect<A, E, R>
} = core.withMaxOpsBeforeYield

/**
 * Retrieves the `Clock` service from the context.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const clock = yield* Effect.clock
 *   const currentTime = yield* clock.currentTimeMillis
 *   console.log(`Current time in milliseconds: ${currentTime}`)
 * })
 *
 * // Effect.runFork(program)
 * // Example Output:
 * // Current time in milliseconds: 1735484796134
 * ```
 *
 * @since 2.0.0
 * @category Clock
 */
export const clock: Effect<Clock.Clock> = effect.clock

/**
 * Retrieves the `Clock` service from the context and provides it to the
 * specified effectful function.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const program = Effect.clockWith((clock) =>
 *   clock.currentTimeMillis.pipe(
 *     Effect.map((currentTime) => `Current time is: ${currentTime}`),
 *     Effect.tap(Console.log)
 *   )
 * )
 *
 * // Effect.runFork(program)
 * // Example Output:
 * // Current time is: 1735484929744
 * ```
 *
 * @since 2.0.0
 * @category Clock
 */
export const clockWith: <A, E, R>(f: (clock: Clock.Clock) => Effect<A, E, R>) => Effect<A, E, R> = effect.clockWith

/**
 * Sets the implementation of the `Clock` service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category Clock
 */
export const withClockScoped: <C extends Clock.Clock>(clock: C) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withClockScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * `Clock` service.
 *
 * @since 2.0.0
 * @category Clock
 */
export const withClock: {
  <C extends Clock.Clock>(clock: C): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <C extends Clock.Clock, A, E, R>(effect: Effect<A, E, R>, clock: C): Effect<A, E, R>
} = defaultServices.withClock

/**
 * Retreives the `Console` service from the context
 *
 * @since 2.0.0
 * @category Console
 */
export const console: Effect<Console> = console_.console

/**
 * Retreives the `Console` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category Console
 */
export const consoleWith: <A, E, R>(f: (console: Console) => Effect<A, E, R>) => Effect<A, E, R> = console_.consoleWith

/**
 * Sets the implementation of the console service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const withConsoleScoped: <A extends Console>(console: A) => Effect<void, never, Scope.Scope> =
  console_.withConsoleScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * console service.
 *
 * @since 2.0.0
 * @category Console
 */
export const withConsole: {
  <C extends Console>(console: C): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, C extends Console>(effect: Effect<A, E, R>, console: C): Effect<A, E, R>
} = console_.withConsole

/**
 * Delays the execution of an effect by a specified `Duration`.
 *
 * **Details
 *
 * This function postpones the execution of the provided effect by the specified
 * duration. The duration can be provided in various formats supported by the
 * `Duration` module.
 *
 * Internally, this function does not block the thread; instead, it uses an
 * efficient, non-blocking mechanism to introduce the delay.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const task = Console.log("Task executed")
 *
 * const program = Console.log("start").pipe(
 *   Effect.andThen(
 *     // Delays the log message by 2 seconds
 *     task.pipe(Effect.delay("2 seconds"))
 *   )
 * )
 *
 * // Effect.runFork(program)
 * // Output:
 * // start
 * // Task executed
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
 */
export const delay: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<A, E, R>
} = effect.delay

/**
 * Suspends the execution of an effect for a specified `Duration`.
 *
 * **Details**
 *
 * This function pauses the execution of an effect for a given duration. It is
 * asynchronous, meaning that it does not block the fiber executing the effect.
 * Instead, the fiber is suspended during the delay period and can resume once
 * the specified time has passed.
 *
 * The duration can be specified using various formats supported by the
 * `Duration` module, such as a string (`"2 seconds"`) or numeric value
 * representing milliseconds.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   console.log("Starting task...")
 *   yield* Effect.sleep("3 seconds") // Waits for 3 seconds
 *   console.log("Task completed!")
 * })
 *
 * // Effect.runFork(program)
 * // Output:
 * // Starting task...
 * // Task completed!
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
 */
export const sleep: (duration: Duration.DurationInput) => Effect<void> = effect.sleep

/**
 * Executes an effect and measures the time it takes to complete.
 *
 * **Details**
 *
 * This function wraps the provided effect and returns a new effect that, when
 * executed, performs the original effect and calculates its execution duration.
 *
 * The result of the new effect includes both the execution time (as a
 * `Duration`) and the original effect's result. This is useful for monitoring
 * performance or gaining insights into the time taken by specific operations.
 *
 * The original effect's behavior (success, failure, or interruption) remains
 * unchanged, and the timing information is provided alongside the result in a
 * tuple.
 *
 * @example
 * ```ts
 * import { Duration, Effect } from "effect"
 *
 * const task = Effect.gen(function*() {
 *   yield* Effect.sleep("2 seconds") // Simulates some work
 *   return "some result"
 * })
 *
 * const timedTask = task.pipe(Effect.timed)
 *
 * const program = Effect.gen(function*() {
 *   const [duration, result] = yield* timedTask
 *   console.log(`Task completed in ${Duration.toMillis(duration)} ms with result: ${result}`)
 * })
 *
 * // Effect.runFork(program)
 * // Output: Task completed in 2003.749125 ms with result: some result
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
 */
export const timed: <A, E, R>(self: Effect<A, E, R>) => Effect<[duration: Duration.Duration, result: A], E, R> =
  effect.timed

/**
 * Executes an effect and measures its execution time using a custom clock.
 *
 * **Details**
 *
 * This function extends the functionality of {@link timed} by allowing you to
 * specify a custom clock for measuring the execution duration. The provided
 * effect (`nanoseconds`) represents the clock and should return the current
 * time in nanoseconds. The timing information is computed using this custom
 * clock instead of the default system clock.
 *
 * @since 2.0.0
 * @category Delays & Timeouts
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
 * Adds a time limit to an effect, triggering a timeout if the effect exceeds
 * the duration.
 *
 * **Details**
 *
 * This function allows you to enforce a time limit on the execution of an
 * effect. If the effect does not complete within the given duration, it fails
 * with a `TimeoutException`. This is useful for preventing tasks from hanging
 * indefinitely, especially in scenarios where responsiveness or resource limits
 * are critical.
 *
 * The returned effect will either:
 * - Succeed with the original effect's result if it completes within the
 *   specified duration.
 * - Fail with a `TimeoutException` if the time limit is exceeded.
 *
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and
 * timeout handlers.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const task = Effect.gen(function* () {
 *   console.log("Start processing...")
 *   yield* Effect.sleep("2 seconds") // Simulates a delay in processing
 *   console.log("Processing complete.")
 *   return "Result"
 * })
 *
 * // Output will show a TimeoutException as the task takes longer
 * // than the specified timeout duration
 * const timedEffect = task.pipe(Effect.timeout("1 second"))
 *
 * // Effect.runPromiseExit(timedEffect).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: { _tag: 'TimeoutException' }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
 */
export const timeout: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E | Cause.TimeoutException, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<A, Cause.TimeoutException | E, R>
} = circular.timeout

/**
 * Gracefully handles timeouts by returning an `Option` that represents either
 * the result or a timeout.
 *
 * **Details**
 *
 * This function wraps the outcome of an effect in an `Option` type. If the
 * effect completes within the specified duration, it returns a `Some`
 * containing the result. If the effect times out, it returns a `None`. Unlike
 * other timeout methods, this approach does not raise errors or exceptions;
 * instead, it allows you to treat timeouts as a regular outcome, simplifying
 * the logic for handling delays.
 *
 * **When to Use**
 *
 * This is useful when you want to handle timeouts without causing the program
 * to fail, making it easier to manage situations where you expect tasks might
 * take too long but want to continue executing other tasks.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and
 * timeout handlers.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const task = Effect.gen(function* () {
 *   console.log("Start processing...")
 *   yield* Effect.sleep("2 seconds") // Simulates a delay in processing
 *   console.log("Processing complete.")
 *   return "Result"
 * })
 *
 * const timedOutEffect = Effect.all([
 *   task.pipe(Effect.timeoutOption("3 seconds")),
 *   task.pipe(Effect.timeoutOption("1 second"))
 * ])
 *
 * // Effect.runPromise(timedOutEffect).then(console.log)
 * // Output:
 * // Start processing...
 * // Processing complete.
 * // Start processing...
 * // [
 * //   { _id: 'Option', _tag: 'Some', value: 'Result' },
 * //   { _id: 'Option', _tag: 'None' }
 * // ]
 * ```
 *
 * @since 3.1.0
 * @category Delays & Timeouts
 */
export const timeoutOption: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<Option.Option<A>, E, R>
} = circular.timeoutOption

/**
 * Specifies a custom error to be produced when a timeout occurs.
 *
 * **Details**
 *
 * This function allows you to handle timeouts in a customized way by defining a
 * specific error to be raised when an effect exceeds the given duration. Unlike
 * default timeout behaviors that use generic exceptions, this function gives
 * you the flexibility to specify a meaningful error type that aligns with your
 * application's needs.
 *
 * When you apply this function, you provide:
 * - A `duration`: The time limit for the effect.
 * - An `onTimeout` function: A lazy evaluation function that generates the
 *   custom error if the timeout occurs.
 *
 * If the effect completes within the time limit, its result is returned
 * normally. Otherwise, the `onTimeout` function is triggered, and its output is
 * used as the error for the effect.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and
 * timeout handlers.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const task = Effect.gen(function* () {
 *   console.log("Start processing...")
 *   yield* Effect.sleep("2 seconds") // Simulates a delay in processing
 *   console.log("Processing complete.")
 *   return "Result"
 * })
 *
 * class MyTimeoutError {
 *   readonly _tag = "MyTimeoutError"
 * }
 *
 * const program = task.pipe(
 *   Effect.timeoutFail({
 *     duration: "1 second",
 *     onTimeout: () => new MyTimeoutError() // Custom timeout error
 *   })
 * )
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: MyTimeoutError { _tag: 'MyTimeoutError' }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
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
 * Specifies a custom defect to be thrown when a timeout occurs.
 *
 * **Details**
 *
 * This function allows you to handle timeouts as exceptional cases by
 * generating a custom defect when an effect exceeds the specified duration. You
 * provide:
 * - A `duration`: The time limit for the effect.
 * - An `onTimeout` function: A lazy evaluation function that generates the
 *   custom defect (typically created using `Cause.die`).
 *
 * If the effect completes within the time limit, its result is returned
 * normally. Otherwise, the custom defect is triggered, and the effect fails
 * with that defect.
 *
 * **When to Use**
 *
 * This is especially useful when you need to treat timeouts as critical
 * failures in your application and wish to include meaningful information in
 * the defect.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutTo} for a version that allows specifying both success and
 * timeout handlers.
 *
 * @example
 * ```ts
 * import { Effect, Cause } from "effect"
 *
 * const task = Effect.gen(function* () {
 *   console.log("Start processing...")
 *   yield* Effect.sleep("2 seconds") // Simulates a delay in processing
 *   console.log("Processing complete.")
 *   return "Result"
 * })
 *
 * const program = task.pipe(
 *   Effect.timeoutFailCause({
 *     duration: "1 second",
 *     onTimeout: () => Cause.die("Timed out!") // Custom defect for timeout
 *   })
 * )
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Die', defect: 'Timed out!' }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
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
 * Provides custom behavior for successful and timed-out operations.
 *
 * **Details**
 *
 * This function allows you to define distinct outcomes for an effect depending
 * on whether it completes within a specified time frame or exceeds the timeout
 * duration. You can provide:
 * - `onSuccess`: A handler for processing the result of the effect if it
 *   completes successfully within the time limit.
 * - `onTimeout`: A handler for generating a result when the effect times out.
 * - `duration`: The maximum allowed time for the effect to complete.
 *
 * **When to Use**
 *
 * Unlike {@link timeout}, which raises an exception for timeouts, this function
 * gives you full control over the behavior for both success and timeout
 * scenarios. It is particularly useful when you want to encapsulate timeouts
 * and successes into a specific data structure, like an `Either` type, to
 * represent these outcomes in a meaningful way.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 *
 * @example
 * ```ts
 * import { Effect, Either } from "effect"
 *
 * const task = Effect.gen(function* () {
 *   console.log("Start processing...")
 *   yield* Effect.sleep("2 seconds") // Simulates a delay in processing
 *   console.log("Processing complete.")
 *   return "Result"
 * })
 *
 * const program = task.pipe(
 *   Effect.timeoutTo({
 *     duration: "1 second",
 *     onSuccess: (result): Either.Either<string, string> =>
 *       Either.right(result),
 *     onTimeout: (): Either.Either<string, string> =>
 *       Either.left("Timed out!")
 *   })
 * )
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: "Either",
 * //   _tag: "Left",
 * //   left: "Timed out!"
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Delays & Timeouts
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

/**
 * Allows working with the default configuration provider.
 *
 * **Details**
 *
 * This function retrieves the default configuration provider and passes it to
 * the provided function, which can use it to perform computations or retrieve
 * configuration values. The function can return an effect that leverages the
 * configuration provider for its operations.
 *
 * @since 2.0.0
 * @category Config
 */
export const configProviderWith: <A, E, R>(f: (provider: ConfigProvider) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.configProviderWith

/**
 * Executes an effect using a specific configuration provider.
 *
 * **Details**
 *
 * This function lets you run an effect with a specified configuration provider.
 * The custom provider will override the default configuration provider for the
 * duration of the effect's execution.
 *
 * **When to Use**
 *
 * This is particularly useful when you need to use a different set of
 * configuration values or sources for specific parts of your application.
 *
 * @example
 * ```ts
 * import { Config, ConfigProvider, Effect } from "effect"
 *
 * const customProvider: ConfigProvider.ConfigProvider = ConfigProvider.fromMap(
 *   new Map([["custom-key", "custom-value"]])
 * )
 *
 * const program = Effect.withConfigProvider(customProvider)(
 *   Effect.gen(function*() {
 *     const value = yield* Config.string("custom-key")
 *     console.log(`Config value: ${value}`)
 *   })
 * )
 *
 * // Effect.runPromise(program)
 * // Output:
 * // Config value: custom-value
 * ```
 *
 * @since 2.0.0
 * @category Config
 */
export const withConfigProvider: {
  (provider: ConfigProvider): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, provider: ConfigProvider): Effect<A, E, R>
} = defaultServices.withConfigProvider

/**
 * Sets a configuration provider within a scope.
 *
 * **Details**
 *
 * This function sets the configuration provider to a specified value and
 * ensures that it is restored to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category Config
 */
export const withConfigProviderScoped: (provider: ConfigProvider) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withConfigProviderScoped

/**
 * Accesses the full context of the effect.
 *
 * **Details**
 *
 * This function provides the ability to access the entire context required by
 * an effect. The context is a container that holds dependencies or environment
 * values needed by an effect to run. By using this function, you can retrieve
 * and work with the context directly within an effect.
 *
 * @since 2.0.0
 * @category Context
 */
export const context: <R>() => Effect<Context.Context<R>, never, R> = core.context

/**
 * Accesses the context and applies a transformation function.
 *
 * **Details**
 *
 * This function retrieves the context of the effect and applies a pure
 * transformation function to it. The result of the transformation is then
 * returned within the effect.
 *
 * @see {@link contextWithEffect} for a version that allows effectful transformations.
 *
 * @since 2.0.0
 * @category Context
 */
export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<A, never, R> = effect.contextWith

/**
 * Accesses the context and performs an effectful transformation.
 *
 * **Details**
 *
 * This function retrieves the context and allows you to transform it
 * effectually using another effect. It is useful when the transformation
 * involves asynchronous or effectful operations.
 *
 * @see {@link contextWith} for a version that allows pure transformations.
 *
 * @since 2.0.0
 * @category Context
 */
export const contextWithEffect: <R2, A, E, R>(
  f: (context: Context.Context<R2>) => Effect<A, E, R>
) => Effect<A, E, R | R2> = core.contextWithEffect

/**
 * Provides part of the required context while leaving the rest unchanged.
 *
 * **Details**
 *
 * This function allows you to transform the context required by an effect,
 * providing part of the context and leaving the rest to be fulfilled later.
 *
 * @example
 * ```ts
 * import { Context, Effect } from "effect"
 *
 * class Service1 extends Context.Tag("Service1")<Service1, { readonly port: number }>() {}
 * class Service2 extends Context.Tag("Service2")<Service2, { readonly connection: string }>() {}
 *
 * const program = Effect.gen(function*() {
 *   const service1 = yield* Service1
 *   console.log(service1.port)
 *   const service2 = yield* Service2
 *   console.log(service2.connection)
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, never, Service2>
 * //      ▼
 * const programWithService1 = Effect.mapInputContext(
 *   program,
 *   (ctx: Context.Context<Service2>) => Context.add(ctx, Service1, { port: 3000 })
 * )
 *
 * const runnable = programWithService1.pipe(
 *   Effect.provideService(Service2, { connection: "localhost" }),
 *   Effect.provideService(Service1, { port: 3001 })
 * )
 *
 * Effect.runPromise(runnable)
 * // Output:
 * // 3000
 * // localhost
 * ```
 *
 * @since 2.0.0
 * @category Context
 */
export const mapInputContext: {
  <R2, R>(f: (context: Context.Context<R2>) => Context.Context<R>): <A, E>(self: Effect<A, E, R>) => Effect<A, E, R2>
  <A, E, R, R2>(self: Effect<A, E, R>, f: (context: Context.Context<R2>) => Context.Context<R>): Effect<A, E, R2>
} = core.mapInputContext

/**
 * Provides necessary dependencies to an effect, removing its environmental
 * requirements.
 *
 * **Details**
 *
 * This function allows you to supply the required environment for an effect.
 * The environment can be provided in the form of one or more `Layer`s, a
 * `Context`, a `Runtime`, or a `ManagedRuntime`. Once the environment is
 * provided, the effect can run without requiring external dependencies.
 *
 * You can compose layers to create a modular and reusable way of setting up the
 * environment for effects. For example, layers can be used to configure
 * databases, logging services, or any other required dependencies.
 *
 * @see {@link provideService} for providing a service to an effect.
 *
 * @example
 * ```ts
 * import { Context, Effect, Layer } from "effect"
 *
 * class Database extends Context.Tag("Database")<
 *   Database,
 *   { readonly query: (sql: string) => Effect.Effect<Array<unknown>> }
 * >() {}
 *
 * const DatabaseLive = Layer.succeed(
 *   Database,
 *   {
 *     // Simulate a database query
 *     query: (sql: string) => Effect.log(`Executing query: ${sql}`).pipe(Effect.as([]))
 *   }
 * )
 *
 * //      ┌─── Effect<unknown[], never, Database>
 * //      ▼
 * const program = Effect.gen(function*() {
 *   const database = yield* Database
 *   const result = yield* database.query("SELECT * FROM users")
 *   return result
 * })
 *
 * //      ┌─── Effect<unknown[], never, never>
 * //      ▼
 * const runnable = Effect.provide(program, DatabaseLive)
 *
 * // Effect.runPromise(runnable).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="Executing query: SELECT * FROM users"
 * // []
 * ```
 *
 * @since 2.0.0
 * @category Context
 */
export const provide: {
  <const Layers extends [Layer.Layer.Any, ...Array<Layer.Layer.Any>]>(
    layers: Layers
  ): <A, E, R>(
    self: Effect<A, E, R>
  ) => Effect<
    A,
    E | { [k in keyof Layers]: Layer.Layer.Error<Layers[k]> }[number],
    | { [k in keyof Layers]: Layer.Layer.Context<Layers[k]> }[number]
    | Exclude<R, { [k in keyof Layers]: Layer.Layer.Success<Layers[k]> }[number]>
  >
  <ROut, E2, RIn>(
    layer: Layer.Layer<ROut, E2, RIn>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E | E2, RIn | Exclude<R, ROut>>
  <R2>(context: Context.Context<R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, R2>>
  <R2>(runtime: Runtime.Runtime<R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, R2>>
  <E2, R2>(
    managedRuntime: ManagedRuntime.ManagedRuntime<R2, E2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E | E2, Exclude<R, R2>>
  <A, E, R, const Layers extends [Layer.Layer.Any, ...Array<Layer.Layer.Any>]>(
    self: Effect<A, E, R>,
    layers: Layers
  ): Effect<
    A,
    E | { [k in keyof Layers]: Layer.Layer.Error<Layers[k]> }[number],
    | { [k in keyof Layers]: Layer.Layer.Context<Layers[k]> }[number]
    | Exclude<R, { [k in keyof Layers]: Layer.Layer.Success<Layers[k]> }[number]>
  >
  <A, E, R, ROut, E2, RIn>(
    self: Effect<A, E, R>,
    layer: Layer.Layer<ROut, E2, RIn>
  ): Effect<A, E | E2, RIn | Exclude<R, ROut>>
  <A, E, R, R2>(self: Effect<A, E, R>, context: Context.Context<R2>): Effect<A, E, Exclude<R, R2>>
  <A, E, R, R2>(self: Effect<A, E, R>, runtime: Runtime.Runtime<R2>): Effect<A, E, Exclude<R, R2>>
  <A, E, E2, R, R2>(
    self: Effect<A, E, R>,
    runtime: ManagedRuntime.ManagedRuntime<R2, E2>
  ): Effect<A, E | E2, Exclude<R, R2>>
} = layer.effect_provide

/**
 * Provides an implementation for a service in the context of an effect.
 *
 * **Details**
 *
 * This function allows you to supply a specific implementation for a service
 * required by an effect. Services are typically defined using `Context.Tag`,
 * which acts as a unique identifier for the service. By using this function,
 * you link the service to its concrete implementation, enabling the effect to
 * execute successfully without additional requirements.
 *
 * For example, you can use this function to provide a random number generator,
 * a logger, or any other service your effect depends on. Once the service is
 * provided, all parts of the effect that rely on the service will automatically
 * use the implementation you supplied.
 *
 * @see {@link provide} for providing multiple layers to an effect.
 *
 * @example
 * ```ts
 * import { Effect, Context } from "effect"
 *
 * // Declaring a tag for a service that generates random numbers
 * class Random extends Context.Tag("MyRandomService")<
 *   Random,
 *   { readonly next: Effect.Effect<number> }
 * >() {}
 *
 * // Using the service
 * const program = Effect.gen(function* () {
 *   const random = yield* Random
 *   const randomNumber = yield* random.next
 *   console.log(`random number: ${randomNumber}`)
 * })
 *
 * // Providing the implementation
 * //
 * //      ┌─── Effect<void, never, never>
 * //      ▼
 * const runnable = Effect.provideService(program, Random, {
 *   next: Effect.sync(() => Math.random())
 * })
 *
 * // Run successfully
 * // Effect.runPromise(runnable)
 * // Example Output:
 * // random number: 0.8241872233134417
 * ```
 *
 * @since 2.0.0
 * @category Context
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
 * Dynamically provides an implementation for a service using an effect.
 *
 * **Details**
 *
 * This function allows you to provide an implementation for a service
 * dynamically by using another effect. The provided effect is executed to
 * produce the service implementation, which is then made available to the
 * consuming effect. This is particularly useful when the service implementation
 * itself requires asynchronous or resource-intensive initialization.
 *
 * For example, you can use this function to lazily initialize a database
 * connection or fetch configuration values from an external source before
 * making the service available to your effect.
 *
 * @since 2.0.0
 * @category Context
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
 * Creates a function that uses a service from the context to produce a value.
 *
 * @see {@link serviceFunctionEffect} for a version that returns an effect.
 *
 * @since 2.0.0
 * @category Context
 */
export const serviceFunction: <T extends Effect<any, any, any>, Args extends Array<any>, A>(
  getService: T,
  f: (_: Effect.Success<T>) => (...args: Args) => A
) => (...args: Args) => Effect<A, Effect.Error<T>, Effect.Context<T>> = effect.serviceFunction

/**
 * Creates a function that uses a service from the context to produce an effect.
 *
 * @see {@link serviceFunction} for a version that returns a value.
 *
 * @since 2.0.0
 * @category Context
 */
export const serviceFunctionEffect: <T extends Effect<any, any, any>, Args extends Array<any>, A, E, R>(
  getService: T,
  f: (_: Effect.Success<T>) => (...args: Args) => Effect<A, E, R>
) => (...args: Args) => Effect<A, E | Effect.Error<T>, R | Effect.Context<T>> = effect.serviceFunctionEffect

/**
 * @since 2.0.0
 * @category Context
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
 * @category Context
 */
export const serviceConstants: <S, SE, SR>(
  getService: Effect<S, SE, SR>
) => {
  [k in { [k in keyof S]: k }[keyof S]]: S[k] extends Effect<infer A, infer E, infer R> ? Effect<A, SE | E, SR | R>
    : Effect<S[k], SE, SR>
} = effect.serviceConstants

/**
 * @since 2.0.0
 * @category Context
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
 * Retrieves an optional service from the context as an `Option`.
 *
 * **Details**
 *
 * This function retrieves a service from the context and wraps it in an
 * `Option`. If the service is available, it returns a `Some` containing the
 * service. If the service is not found, it returns a `None`. This approach is
 * useful when you want to handle the absence of a service gracefully without
 * causing an error.
 *
 * **When to Use**
 *
 * Use this function when:
 * - You need to access a service that may or may not be present in the context.
 * - You want to handle the absence of a service using the `Option` type instead
 *   of throwing an error.
 *
 * @see {@link serviceOptional} for a version that throws an error if the service is missing.
 *
 * @since 2.0.0
 * @category Context
 */
export const serviceOption: <I, S>(tag: Context.Tag<I, S>) => Effect<Option.Option<S>> = effect.serviceOption

/**
 * Retrieves a service from the context, throwing an error if it is missing.
 *
 * **Details**
 *
 * This function retrieves a required service from the context. If the service
 * is available, it returns the service. If the service is missing, it throws a
 * `NoSuchElementException`, which can be handled using Effect's error-handling
 * mechanisms. This is useful for services that are critical to the execution of
 * your effect.
 *
 * @see {@link serviceOption} for a version that returns an `Option` instead of throwing an error.
 *
 * @since 2.0.0
 * @category Context
 */
export const serviceOptional: <I, S>(tag: Context.Tag<I, S>) => Effect<S, Cause.NoSuchElementException> =
  effect.serviceOptional

/**
 * Updates a service in the context with a new implementation.
 *
 * **Details**
 *
 * This function modifies the existing implementation of a service in the
 * context. It retrieves the current service, applies the provided
 * transformation function `f`, and replaces the old service with the
 * transformed one.
 *
 * **When to Use**
 *
 * This is useful for adapting or extending a service's behavior during the
 * execution of an effect.
 *
 * @since 2.0.0
 * @category Context
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

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
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
 * ```ts
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 * ```
 *
 * @category Do notation
 * @since 2.0.0
 */
export const Do: Effect<{}> = effect.Do

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
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
 * ```ts
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 * ```
 *
 * @category Do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, A extends object, B, E2, R2>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Effect<B, E2, R2>
  ): <E1, R1>(self: Effect<A, E1, R1>) => Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E2 | E1, R2 | R1>
  <A extends object, N extends string, E1, R1, B, E2, R2>(
    self: Effect<A, E1, R1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Effect<B, E2, R2>
  ): Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E1 | E2, R1 | R2>
} = effect.bind

/**
 * `bindAll` combines `all` with `bind`. It is useful
 * when you want to concurrently run multiple effects and then combine their
 * results in a Do notation pipeline.
 *
 * @example
 * ```ts
 * import { Effect, Either, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bindAll(({ x }) => ({
 *     a: Effect.succeed(x),
 *     b: Effect.fail("oops"),
 *   }), { concurrency: 2, mode: "either" })
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, a: Either.right(2), b: Either.left("oops") })
 * ```
 *
 * @category Do notation
 * @since 3.7.0
 */
export const bindAll: {
  <
    A extends object,
    X extends Record<string, Effect<any, any, any>>,
    O extends {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly mode?: "default" | "validate" | "either" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  >(
    f: (a: NoInfer<A>) => [Extract<keyof X, keyof A>] extends [never] ? X : `Duplicate keys`,
    options?: undefined | O
  ): <E1, R1>(
    self: Effect<A, E1, R1>
  ) => [All.ReturnObject<X, false, All.ExtractMode<O>>] extends [Effect<infer Success, infer Error, infer Context>]
    ? Effect<
      { [K in keyof A | keyof Success]: K extends keyof A ? A[K] : K extends keyof Success ? Success[K] : never },
      E1 | Error,
      R1 | Context
    >
    : never
  <
    A extends object,
    X extends Record<string, Effect<any, any, any>>,
    O extends {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly mode?: "default" | "validate" | "either" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    },
    E1,
    R1
  >(
    self: Effect<A, E1, R1>,
    f: (a: NoInfer<A>) => [Extract<keyof X, keyof A>] extends [never] ? X : `Duplicate keys`,
    options?: undefined | {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly mode?: "default" | "validate" | "either" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): [All.ReturnObject<X, false, All.ExtractMode<O>>] extends [Effect<infer Success, infer Error, infer Context>]
    ? Effect<
      { [K in keyof A | keyof Success]: K extends keyof A ? A[K] : K extends keyof Success ? Success[K] : never },
      E1 | Error,
      R1 | Context
    >
    : never
} = circular.bindAll

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
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
 * ```ts
 * import { Effect, pipe } from "effect"
 *
 * const result = pipe(
 *   Effect.Do,
 *   Effect.bind("x", () => Effect.succeed(2)),
 *   Effect.bind("y", () => Effect.succeed(3)),
 *   Effect.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(Effect.runSync(result), { x: 2, y: 3, sum: 5 })
 * ```
 *
 * @category Do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(name: N): <A, E, R>(self: Effect<A, E, R>) => Effect<{ [K in N]: A }, E, R>
  <A, E, R, N extends string>(self: Effect<A, E, R>, name: N): Effect<{ [K in N]: A }, E, R>
} = effect.bindTo

const let_: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): <E, R>(self: Effect<A, E, R>) => Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
  <A extends object, N extends string, E, R, B>(
    self: Effect<A, E, R>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): Effect<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, E, R>
} = effect.let_

export {
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
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
   * ```ts
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
   * ```
   * @category Do notation
   * @since 2.0.0
   */
  let_ as let
}

/**
 * Encapsulates the result of an effect in an `Option`.
 *
 * **Details**
 *
 * This function wraps the outcome of an effect in an `Option` type. If the
 * original effect succeeds, the success value is wrapped in `Option.some`. If
 * the effect fails, the failure is converted to `Option.none`.
 *
 * This is useful for handling cases where you want to explicitly represent the
 * absence of a value due to a failure, while preventing direct failure of the
 * resulting effect (its error type is `never`). Note that fatal errors, such as
 * defects, are not wrapped and will still result in failure.
 *
 * @see {@link either} for a version that uses `Either` instead.
 * @see {@link exit} for a version that uses `Exit` instead.
 *
 * @example
 * ```ts
 * // Title: Using Effect.option to Handle Errors
 * import { Effect } from "effect"
 *
 * const maybe1 = Effect.option(Effect.succeed(1))
 *
 * // Effect.runPromiseExit(maybe1).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Success',
 * //   value: { _id: 'Option', _tag: 'Some', value: 1 }
 * // }
 *
 * const maybe2 = Effect.option(Effect.fail("Uh oh!"))
 *
 * // Effect.runPromiseExit(maybe2).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Success',
 * //   value: { _id: 'Option', _tag: 'None' }
 * // }
 *
 * const maybe3 = Effect.option(Effect.die("Boom!"))
 *
 * // Effect.runPromiseExit(maybe3).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Die', defect: 'Boom!' }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const option: <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, never, R> = effect.option

/**
 * Encapsulates both success and failure of an `Effect` into an `Either` type.
 *
 * **Details**
 *
 * This function converts an effect that may fail into an effect that always
 * succeeds, wrapping the outcome in an `Either` type. The result will be
 * `Either.Left` if the effect fails, containing the error, or `Either.Right` if
 * it succeeds, containing the result.
 *
 * Using this function, you can handle errors explicitly without causing the
 * effect to fail. This can be especially useful in scenarios where you want to
 * chain effects and deal with success and failure in the same logical flow.
 *
 * The resulting effect cannot fail directly because failures are represented
 * inside the `Either` type.
 *
 * @see {@link option} for a version that uses `Option` instead.
 * @see {@link exit} for a version that uses `Exit` instead.
 *
 * @example
 * ```ts
 * import { Effect, Either, Random } from "effect"
 *
 * class HttpError {
 *   readonly _tag = "HttpError"
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 * }
 *
 * //      ┌─── Effect<string, HttpError | ValidationError, never>
 * //      ▼
 * const program = Effect.gen(function* () {
 *   const n1 = yield* Random.next
 *   const n2 = yield* Random.next
 *   if (n1 < 0.5) {
 *     yield* Effect.fail(new HttpError())
 *   }
 *   if (n2 < 0.5) {
 *     yield* Effect.fail(new ValidationError())
 *   }
 *   return "some result"
 * })
 *
 * //      ┌─── Effect<string, never, never>
 * //      ▼
 * const recovered = Effect.gen(function* () {
 *   //      ┌─── Either<string, HttpError | ValidationError>
 *   //      ▼
 *   const failureOrSuccess = yield* Effect.either(program)
 *   return Either.match(failureOrSuccess, {
 *     onLeft: (error) => `Recovering from ${error._tag}`,
 *     onRight: (value) => value // Do nothing in case of success
 *   })
 * })
 * ```
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const either: <A, E, R>(self: Effect<A, E, R>) => Effect<Either.Either<A, E>, never, R> = core.either

/**
 * Encapsulates both success and failure of an `Effect` using the `Exit` type.
 *
 * **Details**
 *
 * This function converts an effect into one that always succeeds, wrapping its
 * outcome in the `Exit` type. The `Exit` type allows explicit handling of both
 * success (`Exit.Success`) and failure (`Exit.Failure`) cases.
 *
 * The failure is no longer propagated directly but encapsulated inside the
 * `Exit.Failure` type. This makes the resulting effect robust and incapable of
 * direct failure (the error type is set to `never`).
 *
 * This function is useful for managing and reasoning about effects with complex
 * outcomes, as it allows for detailed introspection of errors, including
 * defects and unexpected failures.
 *
 * @see {@link option} for a version that uses `Option` instead.
 * @see {@link either} for a version that uses `Either` instead.
 *
 * @example
 * ```ts
 * import { Effect, Cause, Console, Exit } from "effect"
 *
 * // Simulating a runtime error
 * const task = Effect.dieMessage("Boom!")
 *
 * const program = Effect.gen(function* () {
 *   const exit = yield* Effect.exit(task)
 *   if (Exit.isFailure(exit)) {
 *     const cause = exit.cause
 *     if (
 *       Cause.isDieType(cause) &&
 *       Cause.isRuntimeException(cause.defect)
 *     ) {
 *       yield* Console.log(
 *         `RuntimeException defect caught: ${cause.defect.message}`
 *       )
 *     } else {
 *       yield* Console.log("Unknown failure caught.")
 *     }
 *   }
 * })
 *
 * // We get an Exit.Success because we caught all failures
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // RuntimeException defect caught: Boom!
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: undefined
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const exit: <A, E, R>(self: Effect<A, E, R>) => Effect<Exit.Exit<A, E>, never, R> = core.exit

/**
 * Converts an `Effect` into an operation that completes a `Deferred` with its result.
 *
 * **Details**
 *
 * The `intoDeferred` function takes an effect and a `Deferred` and ensures that the `Deferred`
 * is completed based on the outcome of the effect. If the effect succeeds, the `Deferred` is
 * completed with the success value. If the effect fails, the `Deferred` is completed with the
 * failure. Additionally, if the effect is interrupted, the `Deferred` will also be interrupted.
 *
 * @example
 * ```ts
 * import { Deferred, Effect } from "effect"
 *
 * // Define an effect that succeeds
 * const successEffect = Effect.succeed(42)
 *
 * const program = Effect.gen(function*() {
 *   // Create a deferred
 *   const deferred = yield* Deferred.make<number, string>()
 *
 *   // Complete the deferred using the successEffect
 *   const isCompleted = yield* Effect.intoDeferred(successEffect, deferred)
 *
 *   // Access the value of the deferred
 *   const value = yield* Deferred.await(deferred)
 *   console.log(value)
 *
 *   return isCompleted
 * })
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // 42
 * // true
 * ```
 *
 * @since 2.0.0
 * @category Synchronization Utilities
 */
export const intoDeferred: {
  <A, E>(deferred: Deferred.Deferred<A, E>): <R>(self: Effect<A, E, R>) => Effect<boolean, never, R>
  <A, E, R>(self: Effect<A, E, R>, deferred: Deferred.Deferred<A, E>): Effect<boolean, never, R>
} = core.intoDeferred

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
   * Executes one of two effects based on a condition evaluated by an effectful predicate.
   *
   * Use `if` to run one of two effects depending on whether the predicate effect
   * evaluates to `true` or `false`. If the predicate is `true`, the `onTrue` effect
   * is executed. If it is `false`, the `onFalse` effect is executed instead.
   *
   * @example
   * ```ts
   * // Title: Simulating a Coin Flip
   * import { Effect, Random, Console } from "effect"
   *
   * const flipTheCoin = Effect.if(Random.nextBoolean, {
   *   onTrue: () => Console.log("Head"), // Runs if the predicate is true
   *   onFalse: () => Console.log("Tail") // Runs if the predicate is false
   * })
   *
   * // Effect.runFork(flipTheCoin)
   *
   * ```
   * @since 2.0.0
   * @category Conditional Operators
   */
  if_ as if
}

/**
 * Filters an effect, dying with a custom defect if the predicate fails.
 *
 * **Details**
 *
 * This function applies a predicate to the result of an effect. If the
 * predicate evaluates to `false`, the effect dies with a custom defect
 * generated by the `orDieWith` function.
 *
 * **When to Use**
 *
 * This is useful for enforcing constraints on values and treating violations as
 * fatal program errors.
 *
 * @since 2.0.0
 * @category Filtering
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
 * Filters an effect, dying with a custom message if the predicate fails.
 *
 * **Details**
 *
 * This function works like {@link filterOrDie} but allows you to specify a
 * custom error message to describe the reason for the failure. The message is
 * included in the defect when the predicate evaluates to `false`.
 *
 * @since 2.0.0
 * @category Filtering
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
 * Filters an effect, providing an alternative effect if the predicate fails.
 *
 * **Details**
 *
 * This function applies a predicate to the result of an effect. If the
 * predicate evaluates to `false`, it executes the `orElse` effect instead. The
 * `orElse` effect can produce an alternative value or perform additional
 * computations.
 *
 * @since 2.0.0
 * @category Filtering
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
 * Filters an effect, failing with a custom error if the predicate fails.
 *
 * **Details**
 *
 * This function applies a predicate to the result of an effect. If the
 * predicate evaluates to `false`, the effect fails with a custom error
 * generated by the `orFailWith` function.
 *
 * **When to Use**
 *
 * This is useful for enforcing constraints and treating violations as
 * recoverable errors.
 *
 * **Providing a Guard**
 *
 * In addition to the filtering capabilities discussed earlier, you have the
 * option to further refine and narrow down the type of the success channel by
 * providing a [user-defined type
 * guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).
 * Let's explore this concept through an example:
 *
 * @example
 * ```ts
 * import { Effect, pipe } from "effect"
 *
 * // Define a user interface
 * interface User {
 *   readonly name: string
 * }
 *
 * // Simulate an asynchronous authentication function
 * declare const auth: () => Promise<User | null>
 *
 * const program = pipe(
 *   Effect.promise(() => auth()),
 *   // Use filterOrFail with a custom type guard to ensure user is not null
 *   Effect.filterOrFail(
 *     (user): user is User => user !== null, // Type guard
 *     () => new Error("Unauthorized")
 *   ),
 *   // 'user' now has the type `User` (not `User | null`)
 *   Effect.andThen((user) => user.name)
 * )
 * ```
 *
 * @since 2.0.0
 * @category Filtering
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
 * Executes an effect only if the condition is `false`.
 *
 * @see {@link unlessEffect} for a version that allows the condition to be an effect.
 * @see {@link when} for a version that executes the effect when the condition is `true`.
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const unless: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, condition: LazyArg<boolean>): Effect<Option.Option<A>, E, R>
} = effect.unless

/**
 * Conditionally execute an effect based on the result of another effect.
 *
 * @see {@link unless} for a version that allows the condition to be a boolean.
 * @see {@link whenEffect} for a version that executes the effect when the condition is `true`.
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const unlessEffect: {
  <E2, R2>(
    condition: Effect<boolean, E2, R2>
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: Effect<A, E, R>, condition: Effect<boolean, E2, R2>): Effect<Option.Option<A>, E | E2, R | R2>
} = effect.unlessEffect

/**
 * Conditionally executes an effect based on a boolean condition.
 *
 * **Details**
 *
 * This function allows you to run an effect only if a given condition evaluates
 * to `true`. If the condition is `true`, the effect is executed, and its result
 * is wrapped in an `Option.some`. If the condition is `false`, the effect is
 * skipped, and the result is `Option.none`.
 *
 * **When to Use**
 *
 * This function is useful for scenarios where you need to dynamically decide
 * whether to execute an effect based on runtime logic, while also representing
 * the skipped case explicitly.
 *
 * @see {@link whenEffect} for a version that allows the condition to be an effect.
 * @see {@link unless} for a version that executes the effect when the condition is `false`.
 *
 * @example
 * ```ts
 * // Title: Conditional Effect Execution
 * import { Effect, Option } from "effect"
 *
 * const validateWeightOption = (
 *   weight: number
 * ): Effect.Effect<Option.Option<number>> =>
 *   // Conditionally execute the effect if the weight is non-negative
 *   Effect.succeed(weight).pipe(Effect.when(() => weight >= 0))
 *
 * // Run with a valid weight
 * // Effect.runPromise(validateWeightOption(100)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Option",
 * //   _tag: "Some",
 * //   value: 100
 * // }
 *
 * // Run with an invalid weight
 * // Effect.runPromise(validateWeightOption(-5)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Option",
 * //   _tag: "None"
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const when: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, condition: LazyArg<boolean>): Effect<Option.Option<A>, E, R>
} = effect.when

/**
 * Conditionally executes an effect based on the result of another effect.
 *
 * **Details**
 *
 * This function allows you to run an effect only if a conditional effect
 * evaluating to a boolean resolves to `true`. If the conditional effect
 * evaluates to `true`, the specified effect is executed, and its result is
 * wrapped in `Option.some`. If the conditional effect evaluates to `false`, the
 * effect is skipped, and the result is `Option.none`.
 *
 * **When to Use**
 *
 * This function is particularly useful when the decision to execute an effect
 * depends on the result of another effect, such as a random value, a
 * user-provided input, or a network request result.
 *
 * @see {@link when} for a version that allows the condition to be a boolean.
 * @see {@link unlessEffect} for a version that executes the effect when the condition is `false`.
 *
 * @example
 * ```ts
 * // Title: Using an Effect as a Condition
 * import { Effect, Random } from "effect"
 *
 * const randomIntOption = Random.nextInt.pipe(
 *   Effect.whenEffect(Random.nextBoolean)
 * )
 *
 * console.log(Effect.runSync(randomIntOption))
 * // Example Output:
 * // { _id: 'Option', _tag: 'Some', value: 8609104974198840 }
 * ```
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const whenEffect: {
  <E, R>(
    condition: Effect<boolean, E, R>
  ): <A, E2, R2>(effect: Effect<A, E2, R2>) => Effect<Option.Option<A>, E | E2, R | R2>
  <A, E2, R2, E, R>(self: Effect<A, E2, R2>, condition: Effect<boolean, E, R>): Effect<Option.Option<A>, E2 | E, R2 | R>
} = core.whenEffect

/**
 * Executes an effect conditionally based on the value of a `FiberRef` that
 * satisfies a predicate.
 *
 * **Details**
 *
 * This function enables you to execute an effect only when the value of a
 * specified `FiberRef` meets a certain condition defined by a predicate. If the
 * value satisfies the predicate, the effect is executed, and the result is
 * wrapped in an `Option.some`. If the predicate is not satisfied, the effect is
 * skipped, and the result is `Option.none`. In both cases, the current value of
 * the `FiberRef` is included in the result.
 *
 * @since 2.0.0
 * @category Conditional Operators
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
 * Executes an effect conditionally based on the value of a `Ref` that satisfies
 * a predicate.
 *
 * **Details**
 *
 * This function allows you to execute an effect only when the value of a
 * specified `Ref` meets a condition defined by a predicate. If the value
 * satisfies the predicate, the effect is executed, and the result is wrapped in
 * an `Option.some`. If the predicate is not satisfied, the effect is skipped,
 * and the result is `Option.none`. In both cases, the current value of the
 * `Ref` is included in the result.
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const whenRef: {
  <S>(ref: Ref.Ref<S>, predicate: Predicate<S>): <A, E, R>(self: Effect<A, E, R>) => Effect<[S, Option.Option<A>], E, R>
  <A, E, R, S>(self: Effect<A, E, R>, ref: Ref.Ref<S>, predicate: Predicate<S>): Effect<[S, Option.Option<A>], E, R>
} = effect.whenRef

/**
 * Chains effects to produce new `Effect` instances, useful for combining
 * operations that depend on previous results.
 *
 * **Syntax**
 * ```ts
 * const flatMappedEffect = pipe(myEffect, Effect.flatMap(transformation))
 * // or
 * const flatMappedEffect = Effect.flatMap(myEffect, transformation)
 * // or
 * const flatMappedEffect = myEffect.pipe(Effect.flatMap(transformation))
 * ```
 *
 * **Details**
 *
 * `flatMap` lets you sequence effects so that the result of one effect can be
 * used in the next step. It is similar to `flatMap` used with arrays but works
 * specifically with `Effect` instances, allowing you to avoid deeply nested
 * effect structures.
 *
 * Since effects are immutable, `flatMap` always returns a new effect instead of
 * changing the original one.
 *
 * **When to Use**
 *
 * Use `flatMap` when you need to chain multiple effects, ensuring that each
 * step produces a new `Effect` while flattening any nested effects that may
 * occur.
 *
 * @see {@link tap} for a version that ignores the result of the effect.
 *
 * @example
 * ```ts
 * import { pipe, Effect } from "effect"
 *
 * // Function to apply a discount safely to a transaction amount
 * const applyDiscount = (
 *   total: number,
 *   discountRate: number
 * ): Effect.Effect<number, Error> =>
 *   discountRate === 0
 *     ? Effect.fail(new Error("Discount rate cannot be zero"))
 *     : Effect.succeed(total - (total * discountRate) / 100)
 *
 * // Simulated asynchronous task to fetch a transaction amount from database
 * const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
 *
 * // Chaining the fetch and discount application using `flatMap`
 * const finalAmount = pipe(
 *   fetchTransactionAmount,
 *   Effect.flatMap((amount) => applyDiscount(amount, 5))
 * )
 *
 * // Effect.runPromise(finalAmount).then(console.log)
 * // Output: 95
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
 */
export const flatMap: {
  <A, B, E1, R1>(f: (a: A) => Effect<B, E1, R1>): <E, R>(self: Effect<A, E, R>) => Effect<B, E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(self: Effect<A, E, R>, f: (a: A) => Effect<B, E1, R1>): Effect<B, E | E1, R | R1>
} = core.flatMap

/**
 * Chains two actions, where the second action can depend on the result of the
 * first.
 *
 * **Syntax**
 * ```ts
 * const transformedEffect = pipe(myEffect, Effect.andThen(anotherEffect))
 * // or
 * const transformedEffect = Effect.andThen(myEffect, anotherEffect)
 * // or
 * const transformedEffect = myEffect.pipe(Effect.andThen(anotherEffect))
 * ```
 *
 * **When to Use**
 *
 * Use `andThen` when you need to run multiple actions in sequence, with the
 * second action depending on the result of the first. This is useful for
 * combining effects or handling computations that must happen in order.
 *
 * **Details**
 *
 * The second action can be:
 *
 * - A constant value (similar to {@link as})
 * - A function returning a value (similar to {@link map})
 * - A `Promise`
 * - A function returning a `Promise`
 * - An `Effect`
 * - A function returning an `Effect` (similar to {@link flatMap})
 *
 * **Note:** `andThen` works well with both `Option` and `Either` types,
 * treating them as effects.
 *
 * @example
 * ```ts
 * // Title: Applying a Discount Based on Fetched Amount
 * import { pipe, Effect } from "effect"
 *
 * // Function to apply a discount safely to a transaction amount
 * const applyDiscount = (
 *   total: number,
 *   discountRate: number
 * ): Effect.Effect<number, Error> =>
 *   discountRate === 0
 *     ? Effect.fail(new Error("Discount rate cannot be zero"))
 *     : Effect.succeed(total - (total * discountRate) / 100)
 *
 * // Simulated asynchronous task to fetch a transaction amount from database
 * const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
 *
 * // Using Effect.map and Effect.flatMap
 * const result1 = pipe(
 *   fetchTransactionAmount,
 *   Effect.map((amount) => amount * 2),
 *   Effect.flatMap((amount) => applyDiscount(amount, 5))
 * )
 *
 * // Effect.runPromise(result1).then(console.log)
 * // Output: 190
 *
 * // Using Effect.andThen
 * const result2 = pipe(
 *   fetchTransactionAmount,
 *   Effect.andThen((amount) => amount * 2),
 *   Effect.andThen((amount) => applyDiscount(amount, 5))
 * )
 *
 * // Effect.runPromise(result2).then(console.log)
 * // Output: 190
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
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
 * @category Sequencing
 */
export const flatten: <A, E1, R1, E, R>(self: Effect<Effect<A, E1, R1>, E, R>) => Effect<A, E | E1, R | R1> =
  core.flatten

/**
 * Races two effects and returns the result of the first successful one.
 *
 * **Details**
 *
 * This function takes two effects and runs them concurrently. The first effect
 * that successfully completes will determine the result of the race, and the
 * other effect will be interrupted.
 *
 * If neither effect succeeds, the function will fail with a `Cause`
 * containing all the errors.
 *
 * **When to Use**
 *
 * This is useful when you want to run two effects concurrently, but only care
 * about the first one to succeed. It is commonly used in cases like timeouts,
 * retries, or when you want to optimize for the faster response without
 * worrying about the other effect.
 *
 * **Handling Success or Failure with Either**
 *
 * If you want to handle the result of whichever task completes first, whether
 * it succeeds or fails, you can use the `Effect.either` function. This function
 * wraps the result in an `Either` type, allowing you to see if the result
 * was a success (`Right`) or a failure (`Left`).
 *
 * @see {@link raceAll} for a version that handles multiple effects.
 * @see {@link raceFirst} for a version that returns the result of the first effect to complete.
 *
 * @example
 * ```ts
 * // Title: Both Tasks Succeed
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.succeed("task1").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const program = Effect.race(task1, task2)
 *
 * // Effect.runFork(program)
 * // Output:
 * // task1 done
 * // task2 interrupted
 * ```
 *
 * @example
 * ```ts
 * // Title: One Task Fails, One Succeeds
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const program = Effect.race(task1, task2)
 *
 * // Effect.runFork(program)
 * // Output:
 * // task2 done
 * ```
 *
 * @example
 * ```ts
 * // Title: Both Tasks Fail
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.fail("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const program = Effect.race(task1, task2)
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Parallel',
 * //     left: { _id: 'Cause', _tag: 'Fail', failure: 'task1' },
 * //     right: { _id: 'Cause', _tag: 'Fail', failure: 'task2' }
 * //   }
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Title: Handling Success or Failure with Either
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * // Run both tasks concurrently, wrapping the result
 * // in Either to capture success or failure
 * const program = Effect.race(Effect.either(task1), Effect.either(task2))
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // task2 interrupted
 * // { _id: 'Either', _tag: 'Left', left: 'task1' }
 * ```
 *
 * @since 2.0.0
 * @category Racing
 */
export const race: {
  <A2, E2, R2>(that: Effect<A2, E2, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: Effect<A2, E2, R2>): Effect<A | A2, E | E2, R | R2>
} = fiberRuntime.race

/**
 * Races multiple effects and returns the first successful result.
 *
 * **Details**
 *
 * This function runs multiple effects concurrently and returns the result of
 * the first one to succeed. If one effect succeeds, the others will be
 * interrupted.
 *
 * If none of the effects succeed, the function will fail with the last error
 * encountered.
 *
 * **When to Use**
 *
 * This is useful when you want to race multiple effects, but only care about
 * the first one to succeed. It is commonly used in cases like timeouts,
 * retries, or when you want to optimize for the faster response without
 * worrying about the other effects.
 *
 * @see {@link race} for a version that handles only two effects.
 *
 * @example
 * ```ts
 * // Title: All Tasks Succeed
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.succeed("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const task3 = Effect.succeed("task3").pipe(
 *   Effect.delay("150 millis"),
 *   Effect.tap(Console.log("task3 done")),
 *   Effect.onInterrupt(() => Console.log("task3 interrupted"))
 * )
 *
 * const program = Effect.raceAll([task1, task2, task3])
 *
 * // Effect.runFork(program)
 * // Output:
 * // task1 done
 * // task2 interrupted
 * // task3 interrupted
 * ```
 *
 * @example
 * ```ts
 * // Title: One Task Fails, Two Tasks Succeed
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const task3 = Effect.succeed("task3").pipe(
 *   Effect.delay("150 millis"),
 *   Effect.tap(Console.log("task3 done")),
 *   Effect.onInterrupt(() => Console.log("task3 interrupted"))
 * )
 *
 * const program = Effect.raceAll([task1, task2, task3])
 *
 * // Effect.runFork(program)
 * // Output:
 * // task3 done
 * // task2 interrupted
 * ```
 *
 * @example
 * ```ts
 * // Title: All Tasks Fail
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() => Console.log("task1 interrupted"))
 * )
 * const task2 = Effect.fail("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() => Console.log("task2 interrupted"))
 * )
 *
 * const task3 = Effect.fail("task3").pipe(
 *   Effect.delay("150 millis"),
 *   Effect.tap(Console.log("task3 done")),
 *   Effect.onInterrupt(() => Console.log("task3 interrupted"))
 * )
 *
 * const program = Effect.raceAll([task1, task2, task3])
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'task2' }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Racing
 */
export const raceAll: <Eff extends Effect<any, any, any>>(
  all: Iterable<Eff>
) => Effect<Effect.Success<Eff>, Effect.Error<Eff>, Effect.Context<Eff>> = fiberRuntime.raceAll

/**
 * Races two effects and returns the result of the first one to complete.
 *
 * **Details**
 *
 * This function takes two effects and runs them concurrently, returning the
 * result of the first one that completes, regardless of whether it succeeds or
 * fails.
 *
 * **When to Use**
 *
 * This function is useful when you want to race two operations, and you want to
 * proceed with whichever one finishes first, regardless of whether it succeeds
 * or fails.
 *
 * **Disconnecting Effects**
 *
 * The `Effect.raceFirst` function safely interrupts the “loser” effect once the other completes, but it will not resume until the loser is cleanly terminated.
 *
 * If you want a quicker return, you can disconnect the interrupt signal for both effects. Instead of calling:
 *
 * ```ts
 * Effect.raceFirst(task1, task2)
 * ```
 *
 * You can use:
 *
 * ```ts
 * Effect.raceFirst(Effect.disconnect(task1), Effect.disconnect(task2))
 * ```
 *
 * This allows both effects to complete independently while still terminating the losing effect in the background.
 *
 * @example
 * ```ts
 * // Title: Both Tasks Succeed
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.succeed("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task1 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task2 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 *
 * const program = Effect.raceFirst(task1, task2).pipe(
 *   Effect.tap(Console.log("more work..."))
 * )
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // task1 done
 * // task2 interrupted
 * // more work...
 * // { _id: 'Exit', _tag: 'Success', value: 'task1' }
 * ```
 *
 * @example
 * ```ts
 * // Title: One Task Fails, One Succeeds
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.fail("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task1 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task2 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 *
 * const program = Effect.raceFirst(task1, task2).pipe(
 *   Effect.tap(Console.log("more work..."))
 * )
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // task2 interrupted
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'task1' }
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Title: Using Effect.disconnect for Quicker Return
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.succeed("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task1 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task2 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 *
 * // Race the two tasks with disconnect to allow quicker return
 * const program = Effect.raceFirst(
 *   Effect.disconnect(task1),
 *   Effect.disconnect(task2)
 * ).pipe(Effect.tap(Console.log("more work...")))
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // task1 done
 * // more work...
 * // { _id: 'Exit', _tag: 'Success', value: 'task1' }
 * // task2 interrupted
 * ```
 *
 * @since 2.0.0
 * @category Racing
 */
export const raceFirst: {
  <A2, E2, R2>(that: Effect<A2, E2, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: Effect<A2, E2, R2>): Effect<A | A2, E | E2, R | R2>
} = circular.raceFirst

/**
 * Races two effects and calls a finisher when the first one completes.
 *
 * **Details**
 *
 * This function runs two effects concurrently and calls a specified “finisher”
 * function once one of the effects completes, regardless of whether it succeeds
 * or fails.
 *
 * The finisher functions for each effect allow you to handle the results of
 * each effect as soon as they complete.
 *
 * The function takes two finisher callbacks, one for each effect, and allows
 * you to specify how to handle the result of the race.
 *
 * **When to Use**
 *
 * This function is useful when you need to react to the completion of either
 * effect without waiting for both to finish. It can be used whenever you want
 * to take action based on the first available result.
 *
 * @example
 * ```ts
 * // Title: Handling Results of Concurrent Tasks
 * import { Effect, Console } from "effect"
 *
 * const task1 = Effect.succeed("task1").pipe(
 *   Effect.delay("100 millis"),
 *   Effect.tap(Console.log("task1 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task1 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 * const task2 = Effect.succeed("task2").pipe(
 *   Effect.delay("200 millis"),
 *   Effect.tap(Console.log("task2 done")),
 *   Effect.onInterrupt(() =>
 *     Console.log("task2 interrupted").pipe(Effect.delay("100 millis"))
 *   )
 * )
 *
 * const program = Effect.raceWith(task1, task2, {
 *   onSelfDone: (exit) => Console.log(`task1 exited with ${exit}`),
 *   onOtherDone: (exit) => Console.log(`task2 exited with ${exit}`)
 * })
 *
 * // Effect.runFork(program)
 * // Output:
 * // task1 done
 * // task1 exited with {
 * //   "_id": "Exit",
 * //   "_tag": "Success",
 * //   "value": "task1"
 * // }
 * // task2 interrupted
 * ```
 *
 * @since 2.0.0
 * @category Racing
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
 * @category Sequencing
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
 * Runs a side effect with the result of an effect without changing the original
 * value.
 *
 * **Details**
 *
 * This function works similarly to `flatMap`, but it ignores the result of the
 * function passed to it. The value from the previous effect remains available
 * for the next part of the chain. Note that if the side effect fails, the
 * entire chain will fail too.
 *
 * **When to Use**
 *
 * Use this function when you want to perform a side effect, like logging or
 * tracking, without modifying the main value. This is useful when you need to
 * observe or record an action but want the original value to be passed to the
 * next step.
 *
 * @see {@link flatMap} for a version that allows you to change the value.
 *
 * @example
 * ```ts
 * // Title: Logging a step in a pipeline
 * import { Console, Effect, pipe } from "effect"
 *
 * // Function to apply a discount safely to a transaction amount
 * const applyDiscount = (
 *   total: number,
 *   discountRate: number
 * ): Effect.Effect<number, Error> =>
 *   discountRate === 0
 *     ? Effect.fail(new Error("Discount rate cannot be zero"))
 *     : Effect.succeed(total - (total * discountRate) / 100)
 *
 * // Simulated asynchronous task to fetch a transaction amount from database
 * const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))
 *
 * const finalAmount = pipe(
 *   fetchTransactionAmount,
 *   // Log the fetched transaction amount
 *   Effect.tap((amount) => Console.log(`Apply a discount to: ${amount}`)),
 *   // `amount` is still available!
 *   Effect.flatMap((amount) => applyDiscount(amount, 5))
 * )
 *
 * // Effect.runPromise(finalAmount).then(console.log)
 * // Output:
 * // Apply a discount to: 100
 * // 95
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
 */
export const tap: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <A, X, E1, R1>(
    f: (a: NoInfer<A>) => Effect<X, E1, R1>,
    options: { onlyEffect: true }
  ): <E, R>(
    self: Effect<A, E, R>
  ) => Effect<A, E | E1, R | R1>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Effect<A, E, R>
  ) => [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <X, E1, R1>(
    f: Effect<X, E1, R1>,
    options: { onlyEffect: true }
  ): <A, E, R>(
    self: Effect<A, E, R>
  ) => Effect<A, E | E1, R | R1>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <A, E, R, X, E1, R1>(
    self: Effect<A, E, R>,
    f: (a: NoInfer<A>) => Effect<X, E1, R1>,
    options: { onlyEffect: true }
  ): Effect<A, E | E1, R | R1>
  <A, E, R, X>(
    self: Effect<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Effect<infer _A1, infer E1, infer R1>] ? Effect<A, E | E1, R | R1>
    : [X] extends [PromiseLike<infer _A1>] ? Effect<A, E | Cause.UnknownException, R>
    : Effect<A, E, R>
  <A, E, R, X, E1, R1>(
    self: Effect<A, E, R>,
    f: Effect<X, E1, R1>,
    options: { onlyEffect: true }
  ): Effect<A, E | E1, R | R1>
} = core.tap

/**
 * Allows you to inspect both success and failure outcomes of an effect and
 * perform side effects for each.
 *
 * **Details**
 *
 * This function enables you to handle both success and failure cases
 * separately, without modifying the main effect's result. It is particularly
 * useful for scenarios where you need to log, monitor, or perform additional
 * actions depending on whether the effect succeeded or failed.
 *
 * When the effect succeeds, the `onSuccess` handler is executed with the
 * success value. When the effect fails, the `onFailure` handler is executed
 * with the failure value. Both handlers can include side effects such as
 * logging or analytics, and neither modifies the original effect's output.
 *
 * If either the success or failure handler fails, the overall effect will also
 * fail.
 *
 * @example
 * ```ts
 * import { Effect, Random, Console } from "effect"
 *
 * // Simulate a task that might fail
 * const task = Effect.filterOrFail(
 *   Random.nextRange(-1, 1),
 *   (n) => n >= 0,
 *   () => "random number is negative"
 * )
 *
 * // Use tapBoth to log both success and failure outcomes
 * const tapping = Effect.tapBoth(task, {
 *   onFailure: (error) => Console.log(`failure: ${error}`),
 *   onSuccess: (randomNumber) =>
 *     Console.log(`random number: ${randomNumber}`)
 * })
 *
 * // Effect.runFork(tapping)
 * // Example Output:
 * // failure: random number is negative
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
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
 * Inspect severe errors or defects (non-recoverable failures) in an effect.
 *
 * **Details**
 *
 * This function is specifically designed to handle and inspect defects, which
 * are critical failures in your program, such as unexpected runtime exceptions
 * or system-level errors. Unlike normal recoverable errors, defects typically
 * indicate serious issues that cannot be addressed through standard error
 * handling.
 *
 * When a defect occurs in an effect, the function you provide to this function
 * will be executed, allowing you to log, monitor, or handle the defect in some
 * way. Importantly, this does not alter the main result of the effect. If no
 * defect occurs, the effect behaves as if this function was not used.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * // Simulate a task that fails with a recoverable error
 * const task1: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * // tapDefect won't log anything because NetworkError is not a defect
 * const tapping1 = Effect.tapDefect(task1, (cause) =>
 *   Console.log(`defect: ${cause}`)
 * )
 *
 * // Effect.runFork(tapping1)
 * // No Output
 *
 * // Simulate a severe failure in the system
 * const task2: Effect.Effect<number, string> = Effect.dieMessage(
 *   "Something went wrong"
 * )
 *
 * // Log the defect using tapDefect
 * const tapping2 = Effect.tapDefect(task2, (cause) =>
 *   Console.log(`defect: ${cause}`)
 * )
 *
 * // Effect.runFork(tapping2)
 * // Output:
 * // defect: RuntimeException: Something went wrong
 * //   ... stack trace ...
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
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
 * Execute a side effect on failure without modifying the original effect.
 *
 * **Details**
 *
 * This function allows you to inspect and react to the failure of an effect by
 * executing an additional effect. The failure value is passed to the provided
 * function, enabling you to log it, track it, or perform any other operation.
 * Importantly, the original failure remains intact and is re-propagated, so the
 * effect's behavior is unchanged.
 *
 * The side effect you provide is only executed when the effect fails. If the
 * effect succeeds, the function is ignored, and the success value is propagated
 * as usual.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * // Simulate a task that fails with an error
 * const task: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * // Use tapError to log the error message when the task fails
 * const tapping = Effect.tapError(task, (error) =>
 *   Console.log(`expected error: ${error}`)
 * )
 *
 * // Effect.runFork(tapping)
 * // Output:
 * // expected error: NetworkError
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
 */
export const tapError: {
  <E, X, E2, R2>(
    f: (e: NoInfer<E>) => Effect<X, E2, R2>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(self: Effect<A, E, R>, f: (e: E) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2>
} = effect.tapError

/**
 * Inspect errors matching a specific tag without altering the original effect.
 *
 * **Details**
 *
 * This function allows you to inspect and handle specific error types based on
 * their `_tag` property. It is particularly useful in applications where errors
 * are modeled with tagged types (e.g., union types with discriminating tags).
 * By targeting errors with a specific `_tag`, you can log or perform actions on
 * them while leaving the error channel and overall effect unchanged.
 *
 * If the error doesn't match the specified tag, this function does nothing, and
 * the effect proceeds as usual.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * class NetworkError {
 *   readonly _tag = "NetworkError"
 *   constructor(readonly statusCode: number) {}
 * }
 *
 * class ValidationError {
 *   readonly _tag = "ValidationError"
 *   constructor(readonly field: string) {}
 * }
 *
 * // Create a task that fails with a NetworkError
 * const task: Effect.Effect<number, NetworkError | ValidationError> =
 *   Effect.fail(new NetworkError(504))
 *
 * // Use tapErrorTag to inspect only NetworkError types and log the status code
 * const tapping = Effect.tapErrorTag(task, "NetworkError", (error) =>
 *   Console.log(`expected error: ${error.statusCode}`)
 * )
 *
 * // Effect.runFork(tapping)
 * // Output:
 * // expected error: 504
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
 */
export const tapErrorTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: NoInfer<Extract<E, { _tag: K }>>) => Effect<A1, E1, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E1, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, A1, E1, R1>(
    self: Effect<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1>
} = effect.tapErrorTag

/**
 * Inspect the complete cause of an error, including failures and defects.
 *
 * **Details**
 *
 * This function provides access to the full cause of an error, including both
 * recoverable failures and irrecoverable defects. It allows you to handle, log,
 * or monitor specific error causes without modifying the result of the effect.
 * The full `Cause` object encapsulates the error and its contextual
 * information, making it useful for debugging and understanding failure
 * scenarios in complex workflows.
 *
 * The effect itself is not modified, and any errors or defects remain in the
 * error channel of the original effect.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * // Create a task that fails with a NetworkError
 * const task1: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * const tapping1 = Effect.tapErrorCause(task1, (cause) =>
 *   Console.log(`error cause: ${cause}`)
 * )
 *
 * // Effect.runFork(tapping1)
 * // Output:
 * // error cause: Error: NetworkError
 *
 * // Simulate a severe failure in the system
 * const task2: Effect.Effect<number, string> = Effect.dieMessage(
 *   "Something went wrong"
 * )
 *
 * const tapping2 = Effect.tapErrorCause(task2, (cause) =>
 *   Console.log(`error cause: ${cause}`)
 * )
 *
 * // Effect.runFork(tapping2)
 * // Output:
 * // error cause: RuntimeException: Something went wrong
 * //   ... stack trace ...
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
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

/**
 * Repeats an effect indefinitely until an error occurs.
 *
 * **Details**
 *
 * This function executes an effect repeatedly in an infinite loop. Each
 * iteration is executed sequentially, and the loop continues until the first
 * error occurs. If the effect succeeds, it starts over from the beginning. If
 * the effect fails, the error is propagated, and the loop stops.
 *
 * Be cautious when using this function, as it will run indefinitely unless an
 * error interrupts it. This makes it suitable for long-running processes or
 * continuous polling tasks, but you should ensure proper error handling or
 * combine it with other operators like `timeout` or `schedule` to prevent
 * unintentional infinite loops.
 *
 * @since 2.0.0
 * @category Repetition / Recursion
 */
export const forever: <A, E, R>(self: Effect<A, E, R>) => Effect<never, E, R> = effect.forever

/**
 * Repeatedly updates a state through an effectful operation until a condition
 * is no longer met.
 *
 * **Details**
 *
 * This function provides a way to implement effectful loops, similar to a
 * `while` loop in JavaScript.
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
 * It starts with an initial state, checks a
 * condition (`while`), and executes a body operation to update the state if the
 * condition evaluates to `true`. The process repeats until the condition
 * returns `false`.
 *
 * The state is passed between iterations, allowing the body operation to modify
 * it dynamically. The final state after the loop ends is returned as the result
 * of the effect.
 *
 * **When to Use**
 *
 * This is particularly useful for scenarios where looping logic involves
 * asynchronous or side-effectful operations, such as polling or iterative
 * computations that depend on external factors.
 *
 * @example
 * ```ts
 * // Title: Effectful Iteration
 * import { Effect } from "effect"
 *
 * const result = Effect.iterate(
 *   // Initial result
 *   1,
 *   {
 *     // Condition to continue iterating
 *     while: (result) => result <= 5,
 *     // Operation to change the result
 *     body: (result) => Effect.succeed(result + 1)
 *   }
 * )
 *
 * // Effect.runPromise(result).then(console.log)
 * // Output: 6
 * ```
 *
 * @since 2.0.0
 * @category Looping
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
 * Repeatedly executes a loop with a state, collecting results or discarding
 * them based on configuration.
 *
 * **Details**
 *
 * This function performs an effectful loop, starting with an initial state and
 * iterating as long as the `while` condition evaluates to `true`, similar to a
 * `while` loop in JavaScript.
 *
 * ```ts
 * let state = initial
 * const result = []
 *
 * while (options.while(state)) {
 *   result.push(options.body(state)) // Perform the effectful operation
 *   state = options.step(state) // Update the state
 * }
 *
 * return result
 * ```
 *
 * During each iteration, the `step` function updates the state, and the `body`
 * effect is executed.
 *
 * The results of the body effect can be collected in an array or discarded
 * based on the `discard` option.
 *
 * **Discarding Intermediate Results**
 *
 * - If `discard` is `false` or not provided, the intermediate results are
 *   collected into an array and returned as the final result.
 * - If `discard` is `true`, the intermediate results are ignored, and the
 *   effect returns `void`.
 *
 * **When to Use**
 *
 * This is useful for implementing loops where you need to perform effectful
 * computations repeatedly, such as processing items in a list, generating
 * values, or performing iterative updates.
 *
 * @example
 * ```ts
 * // Title: Looping with Collected Results
 * import { Effect } from "effect"
 *
 * // A loop that runs 5 times, collecting each iteration's result
 * const result = Effect.loop(
 *   // Initial state
 *   1,
 *   {
 *     // Condition to continue looping
 *     while: (state) => state <= 5,
 *     // State update function
 *     step: (state) => state + 1,
 *     // Effect to be performed on each iteration
 *     body: (state) => Effect.succeed(state)
 *   }
 * )
 *
 * // Effect.runPromise(result).then(console.log)
 * // Output: [1, 2, 3, 4, 5]
 * ```
 *
 * @example
 * // Title: Loop with Discarded Results
 * import { Effect, Console } from "effect"
 *
 * const result = Effect.loop(
 *   // Initial state
 *   1,
 *   {
 *     // Condition to continue looping
 *     while: (state) => state <= 5,
 *     // State update function
 *     step: (state) => state + 1,
 *     // Effect to be performed on each iteration
 *     body: (state) => Console.log(`Currently at state ${state}`),
 *     // Discard intermediate results
 *     discard: true
 *   }
 * )
 *
 * // Effect.runPromise(result).then(console.log)
 * // Output:
 * // Currently at state 1
 * // Currently at state 2
 * // Currently at state 3
 * // Currently at state 4
 * // Currently at state 5
 * // undefined
 *
 * @since 2.0.0
 * @category Looping
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
 * @category Repetition / Recursion
 */
export declare namespace Repeat {
  /**
   * @since 2.0.0
   * @category Repetition / Recursion
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
   * @category Repetition / Recursion
   */
  export interface Options<A> {
    while?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined
    until?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined
    times?: number | undefined
    schedule?: Schedule.Schedule<any, A, any> | undefined
  }
}

/**
 * Repeats an effect based on a specified schedule or until the first failure.
 *
 * **Details**
 *
 * This function executes an effect repeatedly according to the given schedule.
 * Each repetition occurs after the initial execution of the effect, meaning
 * that the schedule determines the number of additional repetitions. For
 * example, using `Schedule.once` will result in the effect being executed twice
 * (once initially and once as part of the repetition).
 *
 * If the effect succeeds, it is repeated according to the schedule. If it
 * fails, the repetition stops immediately, and the failure is returned.
 *
 * The schedule can also specify delays between repetitions, making it useful
 * for tasks like retrying operations with backoff, periodic execution, or
 * performing a series of dependent actions.
 *
 * You can combine schedules for more advanced repetition logic, such as adding
 * delays, limiting recursions, or dynamically adjusting based on the outcome of
 * each execution.
 *
 * @example
 * ```ts
 * // Success Example
 * import { Effect, Schedule, Console } from "effect"
 *
 * const action = Console.log("success")
 * const policy = Schedule.addDelay(Schedule.recurs(2), () => "100 millis")
 * const program = Effect.repeat(action, policy)
 *
 * // Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
 * ```
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
 * // Effect.runPromiseExit(program).then(console.log)
 *
 * @since 2.0.0
 * @category Repetition / Recursion
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
} = schedule_.repeat_combined

/**
 * Repeats an effect a specified number of times or until the first failure.
 *
 * **Details**
 *
 * This function executes an effect initially and then repeats it the specified
 * number of times, as long as it succeeds. For example, calling
 * `repeatN(action, 2)` will execute `action` once initially and then repeat it
 * two additional times if there are no failures.
 *
 * If the effect fails during any repetition, the failure is returned, and no
 * further repetitions are attempted.
 *
 * **When to Use**
 *
 * This function is useful for tasks that need to be retried a fixed number of
 * times or for performing repeated actions without requiring a schedule.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * const action = Console.log("success")
 * const program = Effect.repeatN(action, 2)
 *
 * // Effect.runPromise(program)
 * ```
 *
 * @since 2.0.0
 * @category Repetition / Recursion
 */
export const repeatN: {
  (n: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, n: number): Effect<A, E, R>
} = effect.repeatN

/**
 * Repeats an effect with a schedule, handling failures using a custom handler.
 *
 * **Details**
 *
 * This function allows you to execute an effect repeatedly based on a specified
 * schedule. If the effect fails at any point, a custom failure handler is
 * invoked. The handler is provided with both the failure value and the output
 * of the schedule at the time of failure. This enables advanced error recovery
 * or alternative fallback logic while maintaining flexibility in how
 * repetitions are handled.
 *
 * For example, using a schedule with `recurs(2)` will allow for two additional
 * repetitions after the initial execution, provided the effect succeeds. If a
 * failure occurs during any iteration, the failure handler is invoked to handle
 * the situation.
 *
 * @example
 * ```ts
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
 * // Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
 * ```
 *
 * @since 2.0.0
 * @category Repetition / Recursion
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
} = schedule_.repeatOrElse_Effect

/**
 * Repeats an effect based on a specified schedule.
 *
 * **Details**
 *
 * This function allows you to execute an effect repeatedly according to a given
 * schedule. The schedule determines the timing and number of repetitions. Each
 * repetition can also depend on the decision of the schedule, providing
 * flexibility for complex workflows. This function does not modify the effect's
 * success or failure; it only controls its repetition.
 *
 * For example, you can use a schedule that recurs a specific number of times,
 * adds delays between repetitions, or customizes repetition behavior based on
 * external inputs. The effect runs initially and is repeated according to the
 * schedule.
 *
 * @see {@link scheduleFrom} for a variant that allows the schedule's decision
 * to depend on the result of this effect.
 *
 * @since 2.0.0
 * @category Repetition / Recursion
 */
export const schedule: {
  <R2, Out>(schedule: Schedule.Schedule<Out, unknown, R2>): <A, E, R>(self: Effect<A, E, R>) => Effect<Out, E, R2 | R>
  <A, E, R, R2, Out>(self: Effect<A, E, R>, schedule: Schedule.Schedule<Out, unknown, R2>): Effect<Out, E, R | R2>
} = schedule_.schedule_Effect

/**
 * Runs an effect repeatedly on a new fiber according to a given schedule.
 *
 * **Details**
 *
 * This function starts the provided effect on a new fiber and runs it
 * repeatedly based on the specified schedule. The repetitions are managed by
 * the schedule's rules, which define the timing and number of iterations. The
 * fiber is attached to the current scope, meaning it is automatically managed
 * and cleaned up when the scope is closed.
 *
 * The function returns a `RuntimeFiber` that allows you to monitor or interact
 * with the running fiber.
 *
 * **When to Use**
 *
 * This is particularly useful for concurrent execution of scheduled tasks or
 * when you want to continue processing without waiting for the repetitions to
 * complete.
 *
 * @since 2.0.0
 * @category Repetition / Recursion
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
 * Runs an effect repeatedly according to a schedule, starting from a specified
 * input value.
 *
 * **Details**
 *
 * This function allows you to repeatedly execute an effect based on a schedule.
 * The schedule starts with the given `initial` input value, which is passed to
 * the first execution. Subsequent executions of the effect are controlled by
 * the schedule's rules, using the output of the previous iteration as the input
 * for the next one.
 *
 * The returned effect will complete when the schedule ends or the effect fails,
 * propagating the error.
 *
 * @since 2.0.0
 * @category Repetition / Recursion
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
} = schedule_.scheduleFrom_Effect

/**
 * @since 2.0.0
 * @category Repetition / Recursion
 */
export const whileLoop: <A, E, R>(
  options: {
    readonly while: LazyArg<boolean>
    readonly body: LazyArg<Effect<A, E, R>>
    readonly step: (a: A) => void
  }
) => Effect<void, E, R> = core.whileLoop

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @since 2.0.0
 * @category Fiber Refs
 */
export const getFiberRefs: Effect<FiberRefs.FiberRefs> = effect.fiberRefs

/**
 * Inherits values from all `FiberRef` instances into current fiber.
 *
 * @since 2.0.0
 * @category Fiber Refs
 */
export const inheritFiberRefs: (childFiberRefs: FiberRefs.FiberRefs) => Effect<void> = effect.inheritFiberRefs

/**
 * @since 2.0.0
 * @category Fiber Refs
 */
export const locally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <B, E, R>(use: Effect<B, E, R>) => Effect<B, E, R>
  <B, E, R, A>(use: Effect<B, E, R>, self: FiberRef.FiberRef<A>, value: A): Effect<B, E, R>
} = core.fiberRefLocally

/**
 * @since 2.0.0
 * @category Fiber Refs
 */
export const locallyWith: {
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): <B, E, R>(use: Effect<B, E, R>) => Effect<B, E, R>
  <B, E, R, A>(use: Effect<B, E, R>, self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<B, E, R>
} = core.fiberRefLocallyWith

/**
 * @since 2.0.0
 * @category Fiber Refs
 */
export const locallyScoped: {
  <A>(value: A): (self: FiberRef.FiberRef<A>) => Effect<void, never, Scope.Scope>
  <A>(self: FiberRef.FiberRef<A>, value: A): Effect<void, never, Scope.Scope>
} = fiberRuntime.fiberRefLocallyScoped

/**
 * @since 2.0.0
 * @category Fiber Refs
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
 * @category Fiber Refs
 */
export const patchFiberRefs: (patch: FiberRefsPatch.FiberRefsPatch) => Effect<void> = effect.patchFiberRefs

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @since 2.0.0
 * @category Fiber Refs
 */
export const setFiberRefs: (fiberRefs: FiberRefs.FiberRefs) => Effect<void> = effect.setFiberRefs

/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @since 2.0.0
 * @category Fiber Refs
 */
export const updateFiberRefs: (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
) => Effect<void> = effect.updateFiberRefs

/**
 * Checks if an effect has failed.
 *
 * **Details**
 *
 * This function evaluates whether an effect has resulted in a failure. It
 * returns a boolean value wrapped in an effect, with `true` indicating the
 * effect failed and `false` otherwise.
 *
 * The resulting effect cannot fail (`never` in the error channel) but retains
 * the context of the original effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const failure = Effect.fail("Uh oh!")
 *
 * // console.log(Effect.runSync(Effect.isFailure(failure)))
 * // Output: true
 *
 * const defect = Effect.dieMessage("BOOM!")
 *
 * // Effect.runSync(Effect.isFailure(defect))
 * // throws: BOOM!
 * ```
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const isFailure: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isFailure

/**
 * Checks if an effect has succeeded.
 *
 * **Details**
 *
 * This function evaluates whether an effect has resulted in a success. It
 * returns a boolean value wrapped in an effect, with `true` indicating the
 * effect succeeded and `false` otherwise.
 *
 * The resulting effect cannot fail (`never` in the error channel) but retains
 * the context of the original effect.
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const isSuccess: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isSuccess

/**
 * Handles both success and failure cases of an effect without performing side
 * effects.
 *
 * **Details**
 *
 * `match` lets you define custom handlers for both success and failure
 * scenarios. You provide separate functions to handle each case, allowing you
 * to process the result if the effect succeeds, or handle the error if the
 * effect fails.
 *
 * **When to Use**
 *
 * This is useful for structuring your code to respond differently to success or
 * failure without triggering side effects.
 *
 * @see {@link matchEffect} if you need to perform side effects in the handlers.
 *
 * @example
 * ```ts
 * // Title: Handling Both Success and Failure Cases
 * import { Effect } from "effect"
 *
 * const success: Effect.Effect<number, Error> = Effect.succeed(42)
 *
 * const program1 = Effect.match(success, {
 *   onFailure: (error) => `failure: ${error.message}`,
 *   onSuccess: (value) => `success: ${value}`
 * })
 *
 * // Run and log the result of the successful effect
 * // Effect.runPromise(program1).then(console.log)
 * // Output: "success: 42"
 *
 * const failure: Effect.Effect<number, Error> = Effect.fail(
 *   new Error("Uh oh!")
 * )
 *
 * const program2 = Effect.match(failure, {
 *   onFailure: (error) => `failure: ${error.message}`,
 *   onSuccess: (value) => `success: ${value}`
 * })
 *
 * // Run and log the result of the failed effect
 * // Effect.runPromise(program2).then(console.log)
 * // Output: "failure: Uh oh!"
 * ```
 *
 * @since 2.0.0
 * @category Matching
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
 * Handles failures by matching the cause of failure.
 *
 * **Details**
 *
 * The `matchCause` function allows you to handle failures with access to the
 * full cause of the failure within a fiber.
 *
 * **When to Use**
 *
 * This is useful for differentiating between different types of errors, such as
 * regular failures, defects, or interruptions. You can provide specific
 * handling logic for each failure type based on the cause.
 *
 * @see {@link matchCauseEffect} if you need to perform side effects in the
 * handlers.
 * @see {@link match} if you don't need to handle the cause of the failure.
 *
 * @example
 * ```ts
 * // Title: Handling Different Failure Causes
 * import { Effect } from "effect"
 *
 * const task: Effect.Effect<number, Error> = Effect.die("Uh oh!")
 *
 * const program = Effect.matchCause(task, {
 *   onFailure: (cause) => {
 *     switch (cause._tag) {
 *       case "Fail":
 *         // Handle standard failure
 *         return `Fail: ${cause.error.message}`
 *       case "Die":
 *         // Handle defects (unexpected errors)
 *         return `Die: ${cause.defect}`
 *       case "Interrupt":
 *         // Handle interruption
 *         return `${cause.fiberId} interrupted!`
 *     }
 *     // Fallback for other causes
 *     return "failed due to other causes"
 *   },
 *   onSuccess: (value) =>
 *     // task completes successfully
 *     `succeeded with ${value} value`
 * })
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output: "Die: Uh oh!"
 *
 * ```
 *
 * @since 2.0.0
 * @category Matching
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
 * Handles failures with access to the cause and allows performing side effects.
 *
 * **Details**
 *
 * The `matchCauseEffect` function works similarly to {@link matchCause}, but it
 * also allows you to perform additional side effects based on the failure
 * cause. This function provides access to the complete cause of the failure,
 * making it possible to differentiate between various failure types, and allows
 * you to respond accordingly while performing side effects (like logging or
 * other operations).
 *
 * @see {@link matchCause} if you don't need side effects and only want to handle the result or failure.
 * @see {@link matchEffect} if you don't need to handle the cause of the failure.
 *
 * @example
 * ```ts
 * // Title: Handling Different Failure Causes with Side Effects
 * import { Effect, Console } from "effect"
 *
 * const task: Effect.Effect<number, Error> = Effect.die("Uh oh!")
 *
 * const program = Effect.matchCauseEffect(task, {
 *   onFailure: (cause) => {
 *     switch (cause._tag) {
 *       case "Fail":
 *         // Handle standard failure with a logged message
 *         return Console.log(`Fail: ${cause.error.message}`)
 *       case "Die":
 *         // Handle defects (unexpected errors) by logging the defect
 *         return Console.log(`Die: ${cause.defect}`)
 *       case "Interrupt":
 *         // Handle interruption and log the fiberId that was interrupted
 *         return Console.log(`${cause.fiberId} interrupted!`)
 *     }
 *     // Fallback for other causes
 *     return Console.log("failed due to other causes")
 *   },
 *   onSuccess: (value) =>
 *     // Log success if the task completes successfully
 *     Console.log(`succeeded with ${value} value`)
 * })
 *
 * // Effect.runPromise(program)
 * // Output: "Die: Uh oh!"
 * ```
 *
 * @since 2.0.0
 * @category Matching
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
 * Handles both success and failure cases of an effect, allowing for additional
 * side effects.
 *
 * **Details**
 *
 * The `matchEffect` function is similar to {@link match}, but it enables you to
 * perform side effects in the handlers for both success and failure outcomes.
 *
 * **When to Use**
 *
 * This is useful when you need to execute additional actions, like logging or
 * notifying users, based on whether an effect succeeds or fails.
 *
 * @see {@link match} if you don't need side effects and only want to handle the
 * result or failure.
 *
 * @example
 * ```ts
 * // Title: Handling Both Success and Failure Cases with Side Effects
 * import { Effect } from "effect"
 *
 * const success: Effect.Effect<number, Error> = Effect.succeed(42)
 * const failure: Effect.Effect<number, Error> = Effect.fail(
 *   new Error("Uh oh!")
 * )
 *
 * const program1 = Effect.matchEffect(success, {
 *   onFailure: (error) =>
 *     Effect.succeed(`failure: ${error.message}`).pipe(
 *       Effect.tap(Effect.log)
 *     ),
 *   onSuccess: (value) =>
 *     Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log))
 * })
 *
 * console.log(Effect.runSync(program1))
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="success: 42"
 * // success: 42
 *
 * const program2 = Effect.matchEffect(failure, {
 *   onFailure: (error) =>
 *     Effect.succeed(`failure: ${error.message}`).pipe(
 *       Effect.tap(Effect.log)
 *     ),
 *   onSuccess: (value) =>
 *     Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log))
 * })
 *
 * console.log(Effect.runSync(program2))
 * // Output:
 * // timestamp=... level=INFO fiber=#1 message="failure: Uh oh!"
 * // failure: Uh oh!
 * ```
 *
 * @since 2.0.0
 * @category Matching
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

/**
 * Logs one or more messages or error causes at the current log level.
 *
 * **Details**
 *
 * This function provides a simple way to log messages or error causes during
 * the execution of your effects. By default, logs are recorded at the `INFO`
 * level, but this can be adjusted using other logging utilities
 * (`Logger.withMinimumLogLevel`). Multiple items, including `Cause` instances,
 * can be logged in a single call. When logging `Cause` instances, detailed
 * error information is included in the log output.
 *
 * The log output includes useful metadata like the current timestamp, log
 * level, and fiber ID, making it suitable for debugging and tracking purposes.
 * This function does not interrupt or alter the effect's execution flow.
 *
 * @example
 * ```ts
 * import { Cause, Effect } from "effect"
 *
 * const program = Effect.log(
 *   "message1",
 *   "message2",
 *   Cause.die("Oh no!"),
 *   Cause.die("Oh uh!")
 * )
 *
 * // Effect.runFork(program)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message=message1 message=message2 cause="Error: Oh no!
 * // Error: Oh uh!"
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const log: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.log

/**
 * Logs messages or error causes at a specified log level.
 *
 * **Details**
 *
 * This function allows you to log one or more messages or error causes while
 * specifying the desired log level (e.g., DEBUG, INFO, ERROR). It provides
 * flexibility in categorizing logs based on their importance or severity,
 * making it easier to filter logs during debugging or production monitoring.
 *
 * @example
 * ```ts
 * import { Cause, Effect, LogLevel } from "effect"
 *
 * const program = Effect.logWithLevel(
 *   LogLevel.Error,
 *   "Critical error encountered",
 *   Cause.die("System failure!")
 * )
 *
 * // Effect.runFork(program)
 * // Output:
 * // timestamp=... level=ERROR fiber=#0 message=Critical error encountered cause="Error: System failure!"
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const logWithLevel = (
  level: LogLevel,
  ...message: ReadonlyArray<any>
): Effect<void> => effect.logWithLevel(level)(...message)

/**
 * Logs messages at the TRACE log level.
 *
 * **Details**
 *
 * This function logs the specified messages at the TRACE level. TRACE logs are
 * typically used for very detailed diagnostic information. These messages are
 * not displayed by default. To view them, you must adjust the logging
 * configuration by setting the minimum log level to `LogLevel.Trace` using
 * `Logger.withMinimumLogLevel`.
 *
 * @example
 * ```ts
 * import { Effect, Logger, LogLevel } from "effect"
 *
 * const program = Effect.logTrace("message1").pipe(Logger.withMinimumLogLevel(LogLevel.Trace))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=TRACE fiber=#0 message=message1
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const logTrace: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logTrace

/**
 * Logs messages at the DEBUG log level.
 *
 * **Details**
 *
 * This function logs messages at the DEBUG level, which is typically used for
 * diagnosing application behavior during development. DEBUG messages provide
 * less detailed information than TRACE logs but are still not shown by default.
 * To view these logs, adjust the log level using `Logger.withMinimumLogLevel`.
 *
 * @example
 * ```ts
 * import { Effect, Logger, LogLevel } from "effect"
 *
 * const program = Effect.logDebug("message1").pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=DEBUG fiber=#0 message=message1
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const logDebug: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logDebug

/**
 * Logs messages at the INFO log level.
 *
 * **Details**
 *
 * This function logs messages at the INFO level, suitable for general
 * application events or operational messages. INFO logs are shown by default
 * and are commonly used for highlighting normal, non-error operations.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logInfo: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logInfo

/**
 * Logs messages at the WARNING log level.
 *
 * **Details**
 *
 * This function logs messages at the WARNING level, suitable for highlighting
 * potential issues that are not errors but may require attention. These
 * messages indicate that something unexpected occurred or might lead to errors
 * in the future.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logWarning: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logWarning

/**
 * Logs messages at the ERROR log level.
 *
 * **Details**
 *
 * This function logs messages at the ERROR level, suitable for reporting
 * application errors or failures. These logs are typically used for unexpected
 * issues that need immediate attention.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logError: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logError

/**
 * Logs messages at the FATAL log level.
 *
 * **Details**
 *
 * This function logs messages at the FATAL level, suitable for reporting
 * critical errors that cause the application to terminate or stop functioning.
 * These logs are typically used for unrecoverable errors that require immediate
 * attention.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logFatal: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logFatal

/**
 * Adds a log span to an effect for tracking and logging its execution duration.
 *
 * **Details**
 *
 * This function wraps an effect with a log span, providing performance
 * monitoring and debugging capabilities. The log span tracks the duration of
 * the wrapped effect and logs it with the specified label. This is particularly
 * useful when analyzing time-sensitive operations or understanding the
 * execution time of specific tasks in your application.
 *
 * The logged output will include the label and the total time taken for the
 * operation. The span information is included in the log metadata, making it
 * easy to trace performance metrics in logs.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.sleep("1 second")
 *   yield* Effect.log("The job is finished!")
 * }).pipe(Effect.withLogSpan("myspan"))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=INFO fiber=#0 message="The job is finished!" myspan=1011ms
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const withLogSpan: {
  (label: string): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, label: string): Effect<A, E, R>
} = effect.withLogSpan

/**
 * Adds custom annotations to log entries generated within an effect.
 *
 * **Details**
 *
 * This function allows you to enhance log messages by appending additional
 * context in the form of key-value pairs. These annotations are included in
 * every log message created during the execution of the effect, making the logs
 * more informative and easier to trace.
 *
 * The annotations can be specified as a single key-value pair or as a record of
 * multiple key-value pairs. This is particularly useful for tracking
 * operations, debugging, or associating specific metadata with logs for better
 * observability.
 *
 * The annotated key-value pairs will appear alongside the log message in the
 * output.
 *
 * @see {@link annotateLogsScoped} to add log annotations with a limited scope.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.log("message1")
 *   yield* Effect.log("message2")
 * }).pipe(Effect.annotateLogs("taskId", "1234")) // Annotation as key/value pair
 *
 * // Effect.runFork(program)
 * // timestamp=... level=INFO fiber=#0 message=message1 taskId=1234
 * // timestamp=... level=INFO fiber=#0 message=message2 taskId=1234
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const annotateLogs: {
  (key: string, value: unknown): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, unknown>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: unknown): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, unknown>): Effect<A, E, R>
} = effect.annotateLogs

/**
 * Adds log annotations with a limited scope to enhance contextual logging.
 *
 * **Details**
 *
 * This function allows you to apply key-value annotations to log entries
 * generated within a specific scope of your effect computations. The
 * annotations are restricted to the defined `Scope`, ensuring that they are
 * only applied to logs produced during that scope. Once the scope ends, the
 * annotations are automatically removed, making it easier to manage
 * context-specific logging without affecting other parts of your application.
 *
 * The annotations can be provided as a single key-value pair or as a record of
 * multiple key-value pairs. This flexibility enables fine-grained control over
 * the additional metadata included in logs for specific tasks or operations.
 *
 * @see {@link annotateLogs} to add custom annotations to log entries generated within an effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.log("no annotations")
 *   yield* Effect.annotateLogsScoped({ key: "value" })
 *   yield* Effect.log("message1") // Annotation is applied to this log
 *   yield* Effect.log("message2") // Annotation is applied to this log
 * }).pipe(Effect.scoped, Effect.andThen(Effect.log("no annotations again")))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=INFO fiber=#0 message="no annotations"
 * // timestamp=... level=INFO fiber=#0 message=message1 key=value
 * // timestamp=... level=INFO fiber=#0 message=message2 key=value
 * // timestamp=... level=INFO fiber=#0 message="no annotations again"
 * ```
 *
 * @since 3.1.0
 * @category Logging
 */
export const annotateLogsScoped: {
  (key: string, value: unknown): Effect<void, never, Scope.Scope>
  (values: Record<string, unknown>): Effect<void, never, Scope.Scope>
} = fiberRuntime.annotateLogsScoped

/**
 * Retrieves the current log annotations for the current scope.
 *
 * **Details**
 *
 * This function provides access to the log annotations associated with the
 * current scope. Log annotations are key-value pairs that provide additional
 * context to log entries. They are often used to add metadata such as tags,
 * identifiers, or extra debugging information to logs.
 *
 * By using this function, you can inspect or utilize the annotations applied to
 * the current scope, making it easier to trace and debug specific sections of
 * your application.
 *
 * @see {@link annotateLogs} to add custom annotations to log entries generated within an effect.
 * @see {@link annotateLogsScoped} to add log annotations with a limited scope.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logAnnotations: Effect<HashMap.HashMap<string, unknown>> = effect.logAnnotations

/**
 * Configures whether child fibers will log unhandled errors and at what log
 * level.
 *
 * **Details**
 *
 * This function allows you to control whether unhandled errors from child
 * fibers are logged and to specify the log level for these errors. By default,
 * unhandled errors are reported via the logger. However, using this function,
 * you can choose to suppress these logs by passing `Option.none` or adjust the
 * log level to a specific severity, such as `Error`, `Warning`, or `Info`.
 *
 * This configuration is scoped to the effect it is applied to, meaning the
 * changes only apply to the child fibers created within that effect's context.
 * It is especially useful when you want to reduce noise in logs or prioritize
 * certain types of errors.
 *
 * @example
 * ```ts
 * import { Effect, Fiber, LogLevel, Option } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const fiber = yield* Effect.fork(Effect.fail("Unhandled error!"))
 *   yield* Fiber.join(fiber)
 * })
 *
 * // Effect.runFork(program.pipe(Effect.withUnhandledErrorLogLevel(Option.some(LogLevel.Error))))
 * // Output:
 * // timestamp=... level=ERROR fiber=#1 message="Fiber terminated with an unhandled error" cause="Error: Unhandled error!"
 * ```
 *
 * @since 2.0.0
 * @category Logging
 */
export const withUnhandledErrorLogLevel: {
  (level: Option.Option<LogLevel>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, level: Option.Option<LogLevel>): Effect<A, E, R>
} = core.withUnhandledErrorLogLevel

/**
 * Converts an effect's failure into a fiber termination, removing the error
 * from the effect's type.
 *
 * **Details**
 *
 * The `orDie` function is used when you encounter errors that you do not want
 * to handle or recover from. It removes the error type from the effect and
 * ensures that any failure will terminate the fiber. This is useful for
 * propagating failures as defects, signaling that they should not be handled
 * within the effect.
 *
 * **When to Use*
 *
 * Use `orDie` when failures should be treated as unrecoverable defects and no
 * error handling is required.
 *
 * @see {@link orDieWith} if you need to customize the error.
 *
 * @example
 * ```ts
 * // Title: Propagating an Error as a Defect
 * import { Effect } from "effect"
 *
 * const divide = (a: number, b: number) =>
 *   b === 0
 *     ? Effect.fail(new Error("Cannot divide by zero"))
 *     : Effect.succeed(a / b)
 *
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const program = Effect.orDie(divide(1, 0))
 *
 * // Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: Cannot divide by zero
 * //   ...stack trace...
 * ```
 *
 * @since 2.0.0
 * @category Converting Failures to Defects
 */
export const orDie: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = core.orDie

/**
 * Converts an effect's failure into a fiber termination with a custom error.
 *
 * **Details**
 *
 * The `orDieWith` function behaves like {@link orDie}, but it allows you to provide a mapping
 * function to transform the error before terminating the fiber. This is useful for cases where
 * you want to include a more detailed or user-friendly error when the failure is propagated
 * as a defect.
 *
 * **When to Use**
 *
 * Use `orDieWith` when failures should terminate the fiber as defects, and you want to customize
 * the error for clarity or debugging purposes.
 *
 * @see {@link orDie} if you don't need to customize the error.
 *
 * @example
 * ```ts
 * // Title: Customizing Defect
 * import { Effect } from "effect"
 *
 * const divide = (a: number, b: number) =>
 *   b === 0
 *     ? Effect.fail(new Error("Cannot divide by zero"))
 *     : Effect.succeed(a / b)
 *
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const program = Effect.orDieWith(
 *   divide(1, 0),
 *   (error) => new Error(`defect: ${error.message}`)
 * )
 *
 * // Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: defect: Cannot divide by zero
 * //   ...stack trace...
 * ```
 *
 * @since 2.0.0
 * @category Converting Failures to Defects
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <A, R>(self: Effect<A, E, R>) => Effect<A, never, R>
  <A, E, R>(self: Effect<A, E, R>, f: (error: E) => unknown): Effect<A, never, R>
} = core.orDieWith

/**
 * Attempts one effect, and if it fails, falls back to another effect.
 *
 * **Details**
 *
 * This function allows you to try executing an effect, and if it fails
 * (produces an error), a fallback effect is executed instead. The fallback
 * effect is defined as a lazy argument, meaning it will only be evaluated if
 * the first effect fails. This provides a way to recover from errors by
 * specifying an alternative path of execution.
 *
 * The error type of the resulting effect will be that of the fallback effect,
 * as the first effect's error is replaced when the fallback is executed.
 *
 * @see {@link catchAll} if you need to access the error in the fallback effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const success = Effect.succeed("success")
 * const failure = Effect.fail("failure")
 * const fallback = Effect.succeed("fallback")
 *
 * // Try the success effect first, fallback is not used
 * const program1 = Effect.orElse(success, () => fallback)
 * console.log(Effect.runSync(program1))
 * // Output: "success"
 *
 * // Try the failure effect first, fallback is used
 * const program2 = Effect.orElse(failure, () => fallback)
 * console.log(Effect.runSync(program2))
 * // Output: "fallback"
 * ```
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElse: {
  <A2, E2, R2>(that: LazyArg<Effect<A2, E2, R2>>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: LazyArg<Effect<A2, E2, R2>>): Effect<A2 | A, E2, R2 | R>
} = core.orElse

/**
 * Replaces the failure of an effect with a custom failure value.
 *
 * **Details**
 *
 * This function allows you to handle the failure of an effect by replacing it
 * with a predefined failure value. If the effect fails, the new failure value
 * provided by the `evaluate` function will be returned instead of the original
 * failure. If the effect succeeds, the original success value is returned
 * unchanged.
 *
 * **When to Use**
 *
 * This is particularly useful when you want to standardize error handling or
 * provide a consistent failure value for specific operations. It simplifies
 * error management by ensuring that all failures are replaced with a controlled
 * alternative.
 *
 * @see {@link mapError} if you need to access the error to transform it.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const validate = (age: number): Effect.Effect<number, string> => {
 *   if (age < 0) {
 *     return Effect.fail("NegativeAgeError")
 *   } else if (age < 18) {
 *     return Effect.fail("IllegalAgeError")
 *   } else {
 *     return Effect.succeed(age)
 *   }
 * }
 *
 * const program = Effect.orElseFail(validate(-1), () => "invalid age")
 *
 * console.log(Effect.runSyncExit(program))
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: 'invalid age' }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElseFail: {
  <E2>(evaluate: LazyArg<E2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, evaluate: LazyArg<E2>): Effect<A, E2, R>
} = effect.orElseFail

/**
 * Ensures the effect always succeeds by replacing failures with a default
 * success value.
 *
 * **Details**
 *
 * This function transforms an effect that may fail into one that cannot fail by
 * replacing any failure with a provided success value. If the original effect
 * fails, the failure is "swallowed," and the specified success value is
 * returned instead. If the original effect succeeds, its value remains
 * unchanged.
 *
 * **When to Use**
 *
 * This is especially useful for providing default values in case of failure,
 * ensuring that an effect always completes successfully. By using this
 * function, you can avoid the need for complex error handling and guarantee a
 * fallback result.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const validate = (age: number): Effect.Effect<number, string> => {
 *   if (age < 0) {
 *     return Effect.fail("NegativeAgeError")
 *   } else if (age < 18) {
 *     return Effect.fail("IllegalAgeError")
 *   } else {
 *     return Effect.succeed(age)
 *   }
 * }
 *
 * const program = Effect.orElseSucceed(validate(-1), () => 18)
 *
 * console.log(Effect.runSyncExit(program))
 * // Output:
 * // { _id: 'Exit', _tag: 'Success', value: 18 }
 * ```
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElseSucceed: {
  <A2>(evaluate: LazyArg<A2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, never, R>
  <A, E, R, A2>(self: Effect<A, E, R>, evaluate: LazyArg<A2>): Effect<A | A2, never, R>
} = effect.orElseSucceed

/**
 * Runs a sequence of effects and returns the result of the first successful
 * one.
 *
 * **Details**
 *
 * This function allows you to execute a collection of effects in sequence,
 * stopping at the first success. If an effect succeeds, its result is
 * immediately returned, and no further effects in the sequence are executed.
 * However, if all the effects fail, the function will return the error of the
 * last effect.
 *
 * The execution is sequential, meaning that effects are evaluated one at a time
 * in the order they are provided. This ensures predictable behavior and avoids
 * unnecessary computations.
 *
 * If the collection of effects is empty, an `IllegalArgumentException` is
 * thrown, indicating that the operation is invalid without any effects to try.
 *
 * **When to Use**
 *
 * This is particularly useful when you have multiple fallback strategies or
 * alternative sources to obtain a result, such as attempting multiple APIs,
 * retrieving configurations, or accessing resources in a prioritized manner.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * interface Config {
 *   host: string
 *   port: number
 *   apiKey: string
 * }
 *
 * // Create a configuration object with sample values
 * const makeConfig = (name: string): Config => ({
 *   host: `${name}.example.com`,
 *   port: 8080,
 *   apiKey: "12345-abcde"
 * })
 *
 * // Simulate retrieving configuration from a remote node
 * const remoteConfig = (name: string): Effect.Effect<Config, Error> =>
 *   Effect.gen(function* () {
 *     // Simulate node3 being the only one with available config
 *     if (name === "node3") {
 *       yield* Console.log(`Config for ${name} found`)
 *       return makeConfig(name)
 *     } else {
 *       yield* Console.log(`Unavailable config for ${name}`)
 *       return yield* Effect.fail(new Error(`Config not found for ${name}`))
 *     }
 *   })
 *
 * // Define the master configuration and potential fallback nodes
 * const masterConfig = remoteConfig("master")
 * const nodeConfigs = ["node1", "node2", "node3", "node4"].map(remoteConfig)
 *
 * // Attempt to find a working configuration,
 * // starting with the master and then falling back to other nodes
 * const config = Effect.firstSuccessOf([masterConfig, ...nodeConfigs])
 *
 * // Run the effect to retrieve the configuration
 * const result = Effect.runSync(config)
 *
 * console.log(result)
 * // Output:
 * // Unavailable config for master
 * // Unavailable config for node1
 * // Unavailable config for node2
 * // Config for node3 found
 * // { host: 'node3.example.com', port: 8080, apiKey: '12345-abcde' }
 * ```
 *
 * @since 2.0.0
 * @category Fallback
 */
export const firstSuccessOf: <Eff extends Effect<any, any, any>>(
  effects: Iterable<Eff>
) => Effect<Effect.Success<Eff>, Effect.Error<Eff>, Effect.Context<Eff>> = effect.firstSuccessOf

/**
 * Retrieves the `Random` service from the context.
 *
 * @since 2.0.0
 * @category Random
 */
export const random: Effect<Random.Random> = effect.random

/**
 * Retrieves the `Random` service from the context and uses it to run the
 * specified effect.
 *
 * @since 2.0.0
 * @category Random
 */
export const randomWith: <A, E, R>(f: (random: Random.Random) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.randomWith

/**
 * Executes the specified effect with the specified implementation of the
 * `Random` service.
 *
 * @since 2.0.0
 * @category Random
 */
export const withRandom: {
  <X extends Random.Random>(value: X): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <X extends Random.Random, A, E, R>(effect: Effect<A, E, R>, value: X): Effect<A, E, R>
} = defaultServices.withRandom

/**
 * Sets the implementation of the `Random` service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category Random
 */
export const withRandomScoped: <A extends Random.Random>(value: A) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withRandomScoped

/**
 * Returns an effect that accesses the runtime, which can be used to (unsafely)
 * execute tasks.
 *
 * **When to Use**
 *
 * This is useful for integration with legacy code that must call back into
 * Effect code.
 *
 * @since 2.0.0
 * @category Runtime
 */
export const runtime: <R = never>() => Effect<Runtime.Runtime<R>, never, R> = runtime_.runtime

/**
 * Retrieves an effect that succeeds with the current runtime flags, which
 * govern behavior and features of the runtime system.
 *
 * @since 2.0.0
 * @category Runtime
 */
export const getRuntimeFlags: Effect<RuntimeFlags.RuntimeFlags> = core.runtimeFlags

/**
 * @since 2.0.0
 * @category Runtime
 */
export const patchRuntimeFlags: (patch: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<void> = core.updateRuntimeFlags

/**
 * @since 2.0.0
 * @category Runtime
 */
export const withRuntimeFlagsPatch: {
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, update: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect<A, E, R>
} = core.withRuntimeFlags

/**
 * @since 2.0.0
 * @category Runtime
 */
export const withRuntimeFlagsPatchScoped: (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => Effect<void, never, Scope.Scope> = fiberRuntime.withRuntimeFlagsScoped

/**
 * Tags each metric in an effect with specific key-value pairs.
 *
 * **Details**
 *
 * This function allows you to tag all metrics in an effect with a set of
 * key-value pairs or a single key-value pair. Tags help you add metadata to
 * metrics, making it easier to filter and categorize them in monitoring
 * systems. The provided tags will apply to all metrics generated within the
 * effect's scope.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const tagMetrics: {
  (key: string, value: string): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, string>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: string): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, string>): Effect<A, E, R>
} = effect.tagMetrics

/**
 * Adds labels to metrics within an effect using `MetricLabel` objects.
 *
 * **Details**
 *
 * This function allows you to label metrics using `MetricLabel` objects. Labels
 * help add structured metadata to metrics for categorization and filtering in
 * monitoring systems. The provided labels will apply to all metrics within the
 * effect's execution.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const labelMetrics: {
  (labels: Iterable<MetricLabel.MetricLabel>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, labels: Iterable<MetricLabel.MetricLabel>): Effect<A, E, R>
} = effect.labelMetrics

/**
 * Tags metrics within a scope with a specific key-value pair.
 *
 * **Details**
 *
 * This function tags all metrics within a scope with the provided key-value
 * pair. Once the scope is closed, the tag is automatically removed. This is
 * useful for applying temporary context-specific tags to metrics during scoped
 * operations.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const tagMetricsScoped: (key: string, value: string) => Effect<void, never, Scope.Scope> =
  fiberRuntime.tagMetricsScoped

/**
 * Adds labels to metrics within a scope using `MetricLabel` objects.
 *
 * **Details**
 *
 * This function allows you to apply labels to all metrics generated within a
 * specific scope using an array of `MetricLabel` objects. These labels provide
 * additional metadata to metrics, which can be used for categorization,
 * filtering, or monitoring purposes. The labels are scoped and will be removed
 * automatically once the scope is closed, ensuring they are only applied
 * temporarily within the defined context.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const labelMetricsScoped: (
  labels: ReadonlyArray<MetricLabel.MetricLabel>
) => Effect<void, never, Scope.Scope> = fiberRuntime.labelMetricsScoped

/**
 * Retrieves the metric labels associated with the current scope.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const metricLabels: Effect<ReadonlyArray<MetricLabel.MetricLabel>> = core.metricLabels

/**
 * Associates a metric with the current effect, updating it as the effect progresses.
 *
 * @since 2.0.0
 * @category Metrics
 */
export const withMetric: {
  <Type, In, Out>(metric: Metric.Metric<Type, In, Out>): <A extends In, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A extends In, E, R, Type, In, Out>(self: Effect<A, E, R>, metric: Metric.Metric<Type, In, Out>): Effect<A, E, R>
} = effect.withMetric

/**
 * @category Semaphore
 * @since 2.0.0
 */
export interface Permit {
  readonly index: number
}

/**
 * A semaphore is a synchronization mechanism used to manage access to a shared
 * resource. In Effect, semaphores help control resource access or coordinate
 * tasks within asynchronous, concurrent operations.
 *
 * A semaphore acts as a generalized mutex, allowing a set number of permits to
 * be held and released concurrently. Permits act like tickets, giving tasks or
 * fibers controlled access to a shared resource. When no permits are available,
 * tasks trying to acquire one will wait until a permit is released.
 *
 * @category Semaphore
 * @since 2.0.0
 */
export interface Semaphore {
  /**
   * Runs an effect with the given number of permits and releases the permits
   * when the effect completes.
   *
   * **Details**
   *
   * This function acquires the specified number of permits before executing
   * the provided effect. Once the effect finishes, the permits are released.
   * If insufficient permits are available, the function will wait until they
   * are released by other tasks.
   */
  withPermits(permits: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>

  /**
   * Runs an effect only if the specified number of permits are immediately
   * available.
   *
   * **Details**
   *
   * This function attempts to acquire the specified number of permits. If they
   * are available, it runs the effect and releases the permits after the effect
   * completes. If permits are not available, the effect does not execute, and
   * the result is `Option.none`.
   */
  withPermitsIfAvailable(permits: number): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>

  /**
   * Acquires the specified number of permits and returns the resulting
   * available permits, suspending the task if they are not yet available.
   */
  take(permits: number): Effect<number>

  /**
   * Releases the specified number of permits and returns the resulting
   * available permits.
   */
  release(permits: number): Effect<number>

  /**
   * Releases all permits held by this semaphore and returns the resulting available permits.
   */
  releaseAll: Effect<number>
}

/**
 * Unsafely creates a new Semaphore.
 *
 * @since 2.0.0
 * @category Semaphore
 */
export const unsafeMakeSemaphore: (permits: number) => Semaphore = circular.unsafeMakeSemaphore

/**
 * Creates a new semaphore with the specified number of permits.
 *
 * **Details**
 *
 * This function initializes a semaphore that controls concurrent access to a
 * shared resource. The number of permits determines how many tasks can access
 * the resource concurrently.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * // Create a semaphore with 3 permits
 * const mutex = Effect.makeSemaphore(3)
 * ```
 *
 * @since 2.0.0
 * @category Semaphore
 */
export const makeSemaphore: (permits: number) => Effect<Semaphore> = circular.makeSemaphore

/**
 * A `Latch` is a synchronization primitive that allows you to control the
 * execution of fibers based on an open or closed state. It acts as a gate,
 * where fibers can wait for the latch to open before proceeding.
 *
 * **Details**
 *
 * A `Latch` can be in one of two states: open or closed. Fibers can:
 * - Wait for the latch to open using `await`.
 * - Proceed only when the latch is open using `whenOpen`.
 * - Open the latch to release all waiting fibers using `open`.
 * - Close the latch to block fibers using `close`.
 *
 * Additionally, fibers can be released without changing the state of the latch
 * using `release`.
 *
 * @category Latch
 * @since 3.8.0
 */
export interface Latch extends Effect<void> {
  /**
   * Opens the latch, releasing all fibers waiting on it.
   *
   * **Details**
   *
   * Once the latch is opened, it remains open. Any fibers waiting on `await`
   * will be released and can continue execution.
   */
  readonly open: Effect<void>

  /**
   * Releases all fibers waiting on the latch without opening it.
   *
   * **Details**
   *
   * This function lets waiting fibers proceed without permanently changing the
   * state of the latch.
   */
  readonly release: Effect<void>

  /**
   * Waits for the latch to be opened.
   *
   * **Details**
   *
   * If the latch is already open, this effect completes immediately. Otherwise,
   * it suspends the fiber until the latch is opened.
   */
  readonly await: Effect<void>

  /**
   * Closes the latch, blocking fibers from proceeding.
   *
   * **Details**
   *
   * This operation puts the latch into a closed state, requiring it to be
   * reopened before waiting fibers can proceed.
   */
  readonly close: Effect<void>

  /**
   * Unsafely closes the latch, blocking fibers without effect guarantees.
   *
   * **Details**
   *
   * Use this operation cautiously, as it does not run within an effect context
   * and bypasses runtime guarantees.
   */
  readonly unsafeClose: () => void

  /**
   * Runs the given effect only when the latch is open.
   *
   * **Details**
   *
   * This function ensures that the provided effect executes only if the latch
   * is open. If the latch is closed, the fiber will wait until it opens.
   */
  readonly whenOpen: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>

  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: LatchUnify<this>
  readonly [Unify.ignoreSymbol]?: LatchUnifyIgnore
}

/**
 * @category Models
 * @since 3.8.0
 */
export interface LatchUnify<A extends { [Unify.typeSymbol]?: any }> extends EffectUnify<A> {
  Latch?: () => Latch
}

/**
 * @category Models
 * @since 3.8.0
 */
export interface LatchUnifyIgnore extends EffectUnifyIgnore {
  Effect?: true
}

/**
 * @category Latch
 * @since 3.8.0
 */
export const unsafeMakeLatch: (open?: boolean | undefined) => Latch = circular.unsafeMakeLatch

/**
 * Creates a new `Latch`, starting in the specified state.
 *
 * **Details**
 *
 * This function initializes a `Latch` safely, ensuring proper runtime
 * guarantees. By default, the latch starts in the closed state.
 *
 * @example
 * ```ts
 * import { Console, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   // Create a latch, starting in the closed state
 *   const latch = yield* Effect.makeLatch(false)
 *
 *   // Fork a fiber that logs "open sesame" when the latch is opened
 *   const fiber = yield* Console.log("open sesame").pipe(
 *     latch.whenOpen,
 *     Effect.fork
 *   )
 *
 *   yield* Effect.sleep("1 second")
 *
 *   // Open the latch
 *   yield* latch.open
 *   yield* fiber.await
 * })
 *
 * // Effect.runFork(program)
 * // Output: open sesame (after 1 second)
 * ```
 *
 * @category Latch
 * @since 3.8.0
 */
export const makeLatch: (open?: boolean | undefined) => Effect<Latch, never, never> = circular.makeLatch

/**
 * Runs an effect in the background, returning a fiber that can be observed or
 * interrupted.
 *
 * Unless you specifically need a `Promise` or synchronous operation, `runFork`
 * is a good default choice.
 *
 * **Details**
 *
 * This function is the foundational way to execute an effect in the background.
 * It creates a "fiber," a lightweight, cooperative thread of execution that can
 * be observed (to access its result), interrupted, or joined. Fibers are useful
 * for concurrent programming and allow effects to run independently of the main
 * program flow.
 *
 * Once the effect is running in a fiber, you can monitor its progress, cancel
 * it if necessary, or retrieve its result when it completes. If the effect
 * fails, the fiber will propagate the failure, which you can observe and
 * handle.
 *
 * **When to Use**
 *
 * Use this function when you need to run an effect in the background,
 * especially if the effect is long-running or performs periodic tasks. It's
 * suitable for tasks that need to run independently but might still need
 * observation or management, like logging, monitoring, or scheduled tasks.
 *
 * This function is ideal if you don't need the result immediately or if the
 * effect is part of a larger concurrent workflow.
 *
 * @example
 * ```ts
 * // Title: Running an Effect in the Background
 * import { Effect, Console, Schedule, Fiber } from "effect"
 *
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const program = Effect.repeat(
 *   Console.log("running..."),
 *   Schedule.spaced("200 millis")
 * )
 *
 * //      ┌─── RuntimeFiber<number, never>
 * //      ▼
 * const fiber = Effect.runFork(program)
 *
 * setTimeout(() => {
 *   Effect.runFork(Fiber.interrupt(fiber))
 * }, 500)
 * ```
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runFork: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunForkOptions
) => Fiber.RuntimeFiber<A, E> = runtime_.unsafeForkEffect

/**
 * Executes an effect asynchronously and handles the result using a callback.
 *
 * **Details**
 *
 * This function runs an effect asynchronously and passes the result (`Exit`) to
 * a specified callback. The callback is invoked with the outcome of the effect:
 * - On success, the callback receives the successful result.
 * - On failure, the callback receives the failure information.
 *
 * **When to Use**
 *
 * This function is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runCallback: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunCallbackOptions<A, E> | undefined
) => Runtime.Cancel<A, E> = runtime_.unsafeRunEffect

/**
 * Executes an effect and returns the result as a `Promise`.
 *
 * **Details**
 *
 * This function runs an effect and converts its result into a `Promise`. If the
 * effect succeeds, the `Promise` will resolve with the successful result. If
 * the effect fails, the `Promise` will reject with an error, which includes the
 * failure details of the effect.
 *
 * The optional `options` parameter allows you to pass an `AbortSignal` for
 * cancellation, enabling more fine-grained control over asynchronous tasks.
 *
 * **When to Use**
 *
 * Use this function when you need to execute an effect and work with its result
 * in a promise-based system, such as when integrating with third-party
 * libraries that expect `Promise` results.
 *
 * @see {@link runPromiseExit} for a version that returns an `Exit` type instead
 * of rejecting.
 *
 * @example
 * ```ts
 * // Title: Running a Successful Effect as a Promise
 * import { Effect } from "effect"
 *
 * // Effect.runPromise(Effect.succeed(1)).then(console.log)
 * // Output: 1
 * ```
 *
 * @example
 * //Example: Handling a Failing Effect as a Rejected Promise
 * import { Effect } from "effect"
 *
 * // Effect.runPromise(Effect.fail("my error")).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: my error
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runPromise: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<A> = runtime_.unsafeRunPromiseEffect

/**
 * Runs an effect and returns a `Promise` that resolves to an `Exit`,
 * representing the outcome.
 *
 * **Details**
 *
 * This function executes an effect and resolves to an `Exit` object. The `Exit`
 * type provides detailed information about the result of the effect:
 * - If the effect succeeds, the `Exit` will be of type `Success` and include
 *   the value produced by the effect.
 * - If the effect fails, the `Exit` will be of type `Failure` and contain a
 *   `Cause` object, detailing the failure.
 *
 * Using this function allows you to examine both successful results and failure
 * cases in a unified way, while still leveraging `Promise` for handling the
 * asynchronous behavior of the effect.
 *
 * **When to Use**
 *
 * Use this function when you need to understand the outcome of an effect,
 * whether it succeeded or failed, and want to work with this result using
 * `Promise` syntax. This is particularly useful when integrating with systems
 * that rely on promises but need more detailed error handling than a simple
 * rejection.
 *
 * @example
 * ```ts
 * // Title: Handling Results as Exit
 * import { Effect } from "effect"
 *
 * // Execute a successful effect and get the Exit result as a Promise
 * // Effect.runPromiseExit(Effect.succeed(1)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: 1
 * // }
 *
 * // Execute a failing effect and get the Exit result as a Promise
 * // Effect.runPromiseExit(Effect.fail("my error")).then(console.log)
 * // Output:
 * // {
 * //   _id: "Exit",
 * //   _tag: "Failure",
 * //   cause: {
 * //     _id: "Cause",
 * //     _tag: "Fail",
 * //     failure: "my error"
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runPromiseExit: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<Exit.Exit<A, E>> = runtime_.unsafeRunPromiseExitEffect

/**
 * Executes an effect synchronously, running it immediately and returning the
 * result.
 *
 * **Details**
 *
 * This function evaluates the provided effect synchronously, returning its
 * result directly. It is ideal for effects that do not fail or include
 * asynchronous operations. If the effect does fail or involves async tasks, it
 * will throw an error. Execution stops at the point of failure or asynchronous
 * operation, making it unsuitable for effects that require asynchronous
 * handling.
 *
 * **Important**: Attempting to run effects that involve asynchronous operations
 * or failures will result in exceptions being thrown, so use this function with
 * care for purely synchronous and error-free effects.
 *
 * **When to Use**
 *
 * Use this function when:
 * - You are sure that the effect will not fail or involve asynchronous
 *   operations.
 * - You need a direct, synchronous result from the effect.
 * - You are working within a context where asynchronous effects are not
 *   allowed.
 *
 * Avoid using this function for effects that can fail or require asynchronous
 * handling. For such cases, consider using {@link runPromise} or
 * {@link runSyncExit}.
 *
 * @see {@link runSyncExit} for a version that returns an `Exit` type instead of
 * throwing an error.
 *
 * @example
 * ```ts
 * // Title: Synchronous Logging
 * import { Effect } from "effect"
 *
 * const program = Effect.sync(() => {
 *   console.log("Hello, World!")
 *   return 1
 * })
 *
 * const result = Effect.runSync(program)
 * // Output: Hello, World!
 *
 * console.log(result)
 * // Output: 1
 * ```
 *
 * @example
 * // Title: Incorrect Usage with Failing or Async Effects
 * import { Effect } from "effect"
 *
 * try {
 *   // Attempt to run an effect that fails
 *   Effect.runSync(Effect.fail("my error"))
 * } catch (e) {
 *   console.error(e)
 * }
 * // Output:
 * // (FiberFailure) Error: my error
 *
 * try {
 *   // Attempt to run an effect that involves async work
 *   Effect.runSync(Effect.promise(() => Promise.resolve(1)))
 * } catch (e) {
 *   console.error(e)
 * }
 * // Output:
 * // (FiberFailure) AsyncFiberException: Fiber #0 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runSync: <A, E>(effect: Effect<A, E>) => A = runtime_.unsafeRunSyncEffect

/**
 * Runs an effect synchronously and returns the result as an `Exit` type.
 *
 * **Details**
 *
 * This function executes the provided effect synchronously and returns an `Exit`
 * type that encapsulates the outcome of the effect:
 * - If the effect succeeds, the result is wrapped in a `Success`.
 * - If the effect fails, it returns a `Failure` containing a `Cause` that explains
 *   the failure.
 *
 * If the effect involves asynchronous operations, this function will return a `Failure`
 * with a `Die` cause, indicating that it cannot resolve the effect synchronously.
 * This makes the function suitable for use only with effects that are synchronous
 * in nature.
 *
 * **When to Use**
 *
 * Use this function when:
 * - You want to handle both success and failure outcomes in a structured way using the `Exit` type.
 * - You are working with effects that are purely synchronous and do not involve asynchronous operations.
 * - You need to debug or inspect failures, including their causes, in a detailed manner.
 *
 * Avoid using this function for effects that involve asynchronous operations, as it will fail with a `Die` cause.
 *
 * @example
 * ```ts
 * // Title: Handling Results as Exit
 * import { Effect } from "effect"
 *
 * console.log(Effect.runSyncExit(Effect.succeed(1)))
 * // Output:
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: 1
 * // }
 *
 * console.log(Effect.runSyncExit(Effect.fail("my error")))
 * // Output:
 * // {
 * //   _id: "Exit",
 * //   _tag: "Failure",
 * //   cause: {
 * //     _id: "Cause",
 * //     _tag: "Fail",
 * //     failure: "my error"
 * //   }
 * // }
 * ```
 *
 * @example
 * // Title: Asynchronous Operation Resulting in Die
 * import { Effect } from "effect"
 *
 * console.log(Effect.runSyncExit(Effect.promise(() => Promise.resolve(1))))
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Die',
 * //     defect: [Fiber #0 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work] {
 * //       fiber: [FiberRuntime],
 * //       _tag: 'AsyncFiberException',
 * //       name: 'AsyncFiberException'
 * //     }
 * //   }
 * // }
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runSyncExit: <A, E>(effect: Effect<A, E>) => Exit.Exit<A, E> = runtime_.unsafeRunSyncExitEffect

/**
 * Combines multiple effects and accumulates both successes and failures.
 *
 * **Details**
 *
 * This function allows you to combine multiple effects, continuing through all
 * effects even if some of them fail. Unlike other functions that stop execution
 * upon encountering an error, this function collects all errors into a `Cause`.
 * The final result includes all successes and the accumulated failures.
 *
 * By default, effects are executed sequentially, but you can control
 * concurrency and batching behavior using the `options` parameter. This
 * provides flexibility in scenarios where you want to maximize performance or
 * ensure specific ordering.
 *
 * @see {@link zip} for a version that stops at the first error.
 *
 * @example
 * ```ts
 * import { Effect, Console } from "effect"
 *
 * const task1 = Console.log("task1").pipe(Effect.as(1))
 * const task2 = Effect.fail("Oh uh!").pipe(Effect.as(2))
 * const task3 = Console.log("task2").pipe(Effect.as(3))
 * const task4 = Effect.fail("Oh no!").pipe(Effect.as(4))
 *
 * const program = task1.pipe(
 *   Effect.validate(task2),
 *   Effect.validate(task3),
 *   Effect.validate(task4)
 * )
 *
 * // Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // task1
 * // task2
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Sequential',
 * //     left: { _id: 'Cause', _tag: 'Fail', failure: 'Oh uh!' },
 * //     right: { _id: 'Cause', _tag: 'Fail', failure: 'Oh no!' }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Error Accumulation
 */
export const validate: {
  <B, E1, R1>(
    that: Effect<B, E1, R1>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[A, B], E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(
    self: Effect<A, E, R>,
    that: Effect<B, E1, R1>,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<[A, B], E | E1, R | R1>
} = fiberRuntime.validate

/**
 * Sequentially combines two effects using a specified combiner function while
 * accumulating errors.
 *
 * **Details**
 *
 * This function combines two effects, `self` and `that`, into a single effect
 * by applying the provided combiner function to their results. If both effects
 * succeed, the combiner function is applied to their results to produce the
 * final value. If either effect fails, the failures are accumulated into a
 * combined `Cause`.
 *
 * By default, effects are executed sequentially. However, the execution mode
 * can be controlled using the `options` parameter to enable concurrency,
 * batching, or customized finalizer behavior.
 *
 * @since 2.0.0
 * @category Error Accumulation
 */
export const validateWith: {
  <B, E1, R1, A, C>(
    that: Effect<B, E1, R1>,
    f: (a: A, b: B) => C,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): <E, R>(self: Effect<A, E, R>) => Effect<C, E1 | E, R1 | R>
  <A, E, R, B, E1, R1, C>(
    self: Effect<A, E, R>,
    that: Effect<B, E1, R1>,
    f: (a: A, b: B) => C,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<C, E | E1, R | R1>
} = fiberRuntime.validateWith

/**
 * Combines two effects into a single effect, producing a tuple of their
 * results.
 *
 * **Details**
 *
 * This function combines two effects, `self` and `that`, into one. It executes
 * the first effect (`self`) and then the second effect (`that`), collecting
 * their results into a tuple. Both effects must succeed for the resulting
 * effect to succeed. If either effect fails, the entire operation fails.
 *
 * By default, the effects are executed sequentially. If the `concurrent` option
 * is set to `true`, the effects will run concurrently, potentially improving
 * performance for independent operations.
 *
 * @see {@link zipWith} for a version that combines the results with a custom
 * function.
 * @see {@link validate} for a version that accumulates errors.
 *
 * @example
 * ```ts
 * // Title: Combining Two Effects Sequentially
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
 * // Combine the two effects together
 * //
 * //      ┌─── Effect<[number, string], never, never>
 * //      ▼
 * const program = Effect.zip(task1, task2)
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // [ 1, 'hello' ]
 * ```
 *
 * @example
 * // Title: Combining Two Effects Concurrently
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
 * // Run both effects concurrently using the concurrent option
 * const program = Effect.zip(task1, task2, { concurrent: true })
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // [ 1, 'hello' ]
 *
 * @since 2.0.0
 * @category Zipping
 */
export const zip: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<[A, A2], E | E2, R | R2>
} = fiberRuntime.zipOptions

/**
 * Executes two effects sequentially, returning the result of the first effect
 * and ignoring the result of the second.
 *
 * **Details**
 *
 * This function allows you to run two effects in sequence, where the result of
 * the first effect is preserved, and the result of the second effect is
 * discarded. By default, the two effects are executed sequentially. If you need
 * them to run concurrently, you can pass the `{ concurrent: true }` option.
 *
 * The second effect will always be executed, even though its result is ignored.
 * This makes it useful for cases where you want to execute an effect for its
 * side effects while keeping the result of another effect.
 *
 * **When to Use**
 *
 * Use this function when you are only interested in the result of the first
 * effect but still need to run the second effect for its side effects, such as
 * logging or performing a cleanup action.
 *
 * @see {@link zipRight} for a version that returns the result of the second
 * effect.
 *
 * @example
 * ```ts
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
 * const program = Effect.zipLeft(task1, task2)
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // 1
 * ```
 *
 * @since 2.0.0
 * @category Zipping
 */
export const zipLeft: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?:
      | {
        readonly concurrent?: boolean | undefined
        readonly batching?: boolean | "inherit" | undefined
        readonly concurrentFinalizers?: boolean | undefined
      }
      | undefined
  ): Effect<A, E | E2, R | R2>
} = fiberRuntime.zipLeftOptions

/**
 * Executes two effects sequentially, returning the result of the second effect
 * while ignoring the result of the first.
 *
 * **Details**
 *
 * This function allows you to run two effects in sequence, keeping the result
 * of the second effect and discarding the result of the first. By default, the
 * two effects are executed sequentially. If you need them to run concurrently,
 * you can pass the `{ concurrent: true }` option.
 *
 * The first effect will always be executed, even though its result is ignored.
 * This makes it useful for scenarios where the first effect is needed for its
 * side effects, but only the result of the second effect is important.
 *
 * **When to Use**
 *
 * Use this function when you are only interested in the result of the second
 * effect but still need to run the first effect for its side effects, such as
 * initialization or setup tasks.
 *
 * @see {@link zipLeft} for a version that returns the result of the first
 * effect.
 *
 * @example
 * ```ts
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
 * const program = Effect.zipRight(task1, task2)
 *
 * // Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // hello
 * ```
 *
 * @since 2.0.0
 * @category Zipping
 */
export const zipRight: {
  <A2, E2, R2>(
    that: Effect<A2, E2, R2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): <A, E, R>(self: Effect<A, E, R>) => Effect<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<A2, E2 | E, R2 | R>
} = fiberRuntime.zipRightOptions

/**
 * Combines two effects sequentially and applies a function to their results to
 * produce a single value.
 *
 * **Details**
 *
 * This function runs two effects in sequence (or concurrently, if the `{
 * concurrent: true }` option is provided) and combines their results using a
 * provided function. Unlike {@link zip}, which returns a tuple of the results,
 * this function processes the results with a custom function to produce a
 * single output.
 *
 * @example
 * ```ts
 * // Title: Combining Effects with a Custom Function
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
 *   // Combines results into a single value
 *   (number, string) => number + string.length
 * )
 *
 * // Effect.runPromise(task3).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#3 message="task1 done"
 * // timestamp=... level=INFO fiber=#2 message="task2 done"
 * // 6
 * ```
 *
 * @since 2.0.0
 * @category Zipping
 */
export const zipWith: {
  <A2, E2, R2, A, B>(
    that: Effect<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): <E, R>(self: Effect<A, E, R>) => Effect<B, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, B>(
    self: Effect<A, E, R>,
    that: Effect<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<B, E2 | E, R2 | R>
} = fiberRuntime.zipWithOptions

/**
 * Applies the function produced by one effect to the value produced by another effect.
 *
 * **Details**
 *
 * This function combines two effects:
 * - The first effect produces a function of type `(a: A) => B`.
 * - The second effect produces a value of type `A`.
 *
 * Once both effects complete successfully, the function is applied to the value, resulting in an effect that produces a value of type `B`.
 *
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

/**
 * @category Requests & Batching
 * @since 2.0.0
 */
export const blocked: <A, E>(blockedRequests: RequestBlock, _continue: Effect<A, E>) => Blocked<A, E> = core.blocked

/**
 * @category Requests & Batching
 * @since 2.0.0
 */
export const runRequestBlock: (blockedRequests: RequestBlock) => Effect<void> = core.runRequestBlock

/**
 * @category Requests & Batching
 * @since 2.0.0
 */
export const step: <A, E, R>(self: Effect<A, E, R>) => Effect<Exit.Exit<A, E> | Blocked<A, E>, never, R> = core.step

/**
 * @since 2.0.0
 * @category Requests & Batching
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
 * @category Requests & Batching
 */
export const cacheRequestResult: <A extends Request.Request<any, any>>(
  request: A,
  result: Request.Request.Result<A>
) => Effect<void> = query.cacheRequest

/**
 * @since 2.0.0
 * @category Requests & Batching
 */
export const withRequestBatching: {
  (requestBatching: boolean): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, requestBatching: boolean): Effect<A, E, R>
} = core.withRequestBatching

/**
 * @since 2.0.0
 * @category Requests & Batching
 */
export const withRequestCaching: {
  (strategy: boolean): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, strategy: boolean): Effect<A, E, R>
} = query.withRequestCaching

/**
 * @since 2.0.0
 * @category Requests & Batching
 */
export const withRequestCache: {
  (cache: Request.Cache): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, cache: Request.Cache): Effect<A, E, R>
} = query.withRequestCache

/**
 * @since 2.0.0
 * @category Tracing
 */
export const tracer: Effect<Tracer.Tracer> = effect.tracer

/**
 * @since 2.0.0
 * @category Tracing
 */
export const tracerWith: <A, E, R>(f: (tracer: Tracer.Tracer) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.tracerWith

/**
 * @since 2.0.0
 * @category Tracing
 */
export const withTracer: {
  (value: Tracer.Tracer): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, value: Tracer.Tracer): Effect<A, E, R>
} = defaultServices.withTracer

/**
 * @since 2.0.0
 * @category Tracing
 */
export const withTracerScoped: (value: Tracer.Tracer) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withTracerScoped

/**
 * Disable the tracer for the given Effect.
 *
 * @since 2.0.0
 * @category Tracing
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * Effect.succeed(42).pipe(
 *   Effect.withSpan("my-span"),
 *   // the span will not be registered with the tracer
 *   Effect.withTracerEnabled(false)
 * )
 * ```
 */
export const withTracerEnabled: {
  (enabled: boolean): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, enabled: boolean): Effect<A, E, R>
} = core.withTracerEnabled

/**
 * @since 2.0.0
 * @category Tracing
 */
export const withTracerTiming: {
  (enabled: boolean): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, enabled: boolean): Effect<A, E, R>
} = core.withTracerTiming

/**
 * Adds annotations to each span in the effect for enhanced traceability.
 *
 * **Details**
 *
 * This function lets you attach key-value annotations to all spans generated
 * during the execution of an effect. Annotations provide additional context,
 * such as metadata or labels, which can help you understand and debug
 * asynchronous workflows more effectively.
 *
 * You can either pass a single key-value pair or a record of key-value pairs to
 * annotate the spans. These annotations can then be visualized in tracing tools
 * that support span annotations.
 *
 * @since 2.0.0
 * @category Tracing
 */
export const annotateSpans: {
  (key: string, value: unknown): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  (values: Record<string, unknown>): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, key: string, value: unknown): Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, values: Record<string, unknown>): Effect<A, E, R>
} = effect.annotateSpans

/**
 * Adds annotations to the currently active span for traceability.
 *
 * **Details**
 *
 * This function adds key-value annotations to the currently active span in the
 * effect's trace. These annotations help provide more context about the
 * operation being executed at a specific point in time. Unlike
 * {@link annotateSpans}, which applies to all spans in an effect, this function
 * focuses solely on the active span.
 *
 * You can either pass a single key-value pair or a record of key-value pairs to
 * annotate the span. These annotations are useful for adding metadata to
 * operations, especially in systems with detailed observability requirements.
 *
 * @since 2.0.0
 * @category Tracing
 */
export const annotateCurrentSpan: {
  (key: string, value: unknown): Effect<void>
  (values: Record<string, unknown>): Effect<void>
} = effect.annotateCurrentSpan

/**
 * @since 2.0.0
 * @category Tracing
 */
export const currentSpan: Effect<Tracer.Span, Cause.NoSuchElementException> = effect.currentSpan

/**
 * @since 2.0.0
 * @category Tracing
 */
export const currentParentSpan: Effect<Tracer.AnySpan, Cause.NoSuchElementException> = effect.currentParentSpan

/**
 * @since 2.0.0
 * @category Tracing
 */
export const spanAnnotations: Effect<HashMap.HashMap<string, unknown>> = effect.spanAnnotations

/**
 * @since 2.0.0
 * @category Tracing
 */
export const spanLinks: Effect<Chunk.Chunk<Tracer.SpanLink>> = effect.spanLinks

/**
 * For all spans in this effect, add a link with the provided span.
 *
 * @since 2.0.0
 * @category Tracing
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
 * @category Tracing
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
 * @category Tracing
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
 * @category Tracing
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
 * @category Tracing
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
 * @category Models
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
 * @category Tracing
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * const getTodo = Effect.functionWithSpan({
 *   body: (id: number) => Effect.succeed(`Got todo ${id}!`),
 *   options: (id) => ({
 *     name: `getTodo-${id}`,
 *     attributes: { id }
 *   })
 * })
 * ```
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
 * @category Tracing
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
 * @category Tracing
 */
export const withParentSpan: {
  (span: Tracer.AnySpan): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, Tracer.ParentSpan>>
  <A, E, R>(self: Effect<A, E, R>, span: Tracer.AnySpan): Effect<A, E, Exclude<R, Tracer.ParentSpan>>
} = effect.withParentSpan

/**
 * Safely handles nullable values by creating an effect that fails for `null` or
 * `undefined`.
 *
 * **Details**
 *
 * This function ensures that an input value is non-null and non-undefined
 * before processing it. If the value is valid, the effect succeeds with the
 * value. If the value is `null` or `undefined`, the effect fails with a
 * `NoSuchElementException`. This is particularly useful for avoiding
 * null-related errors by clearly separating valid values from invalid ones in
 * effectful computations.
 *
 * The failure with `NoSuchElementException` allows you to explicitly handle
 * cases where a value is expected but not provided, leading to safer and more
 * predictable code.
 *
 * **When to Use**
 *
 * Use this function when working with values that may be `null` or `undefined`
 * and you want to ensure that only non-null values are processed. It helps
 * enforce null-safety and makes error handling more explicit.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe1 = Effect.fromNullable(1)
 *
 * // Effect.runPromiseExit(maybe1).then(console.log)
 * // Output:
 * // { _id: 'Exit', _tag: 'Success', value: 1 }
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe2 = Effect.fromNullable(null as number | null)
 *
 * // Effect.runPromiseExit(maybe2).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: {
 * //     _id: 'Cause',
 * //     _tag: 'Fail',
 * //     failure: { _tag: 'NoSuchElementException' }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 * @category Optional Wrapping
 */
export const fromNullable: <A>(value: A) => Effect<NonNullable<A>, Cause.NoSuchElementException> = effect.fromNullable

/**
 * Converts an effect that may fail with a `NoSuchElementException` into an
 * effect that succeeds with an `Option`.
 *
 * **Details**
 *
 * This function transforms an effect that might fail with
 * `Cause.NoSuchElementException` into an effect that succeeds with an `Option`
 * type. If the original effect succeeds, its value is wrapped in `Option.some`.
 * If it fails specifically due to a `NoSuchElementException`, the failure is
 * mapped to `Option.none`. Other types of failures remain unchanged and are
 * passed through as they are.
 *
 * This is useful when working with effects where you want to gracefully handle
 * the absence of a value while preserving other potential failures.
 *
 * **When to Use**
 *
 * Use this function when you need to handle missing values as `Option.none`
 * rather than throwing or propagating errors like `NoSuchElementException`.
 * It’s ideal for scenarios where you want to explicitly represent optionality
 * in a type-safe way while retaining other failure information.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe1 = Effect.fromNullable(1)
 *
 * //      ┌─── Effect<Option<number>, never, never>
 * //      ▼
 * const option1 = Effect.optionFromOptional(maybe1)
 *
 * // Effect.runPromise(option1).then(console.log)
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe2 = Effect.fromNullable(null as number | null)
 *
 * //      ┌─── Effect<Option<number>, never, never>
 * //      ▼
 * const option2 = Effect.optionFromOptional(maybe2)
 *
 * // Effect.runPromise(option2).then(console.log)
 * // Output: { _tag: 'None' }
 * ```
 *
 * @since 2.0.0
 * @category Optional Wrapping
 */
export const optionFromOptional: <A, E, R>(
  self: Effect<A, E, R>
) => Effect<Option.Option<A>, Exclude<E, Cause.NoSuchElementException>, R> = effect.optionFromOptional

/**
 * @since 2.0.0
 * @category Models
 */
export declare namespace Tag {
  /**
   * @since 2.0.0
   * @category Models
   */
  export interface ProhibitedType {
    Service?: `property "Service" is forbidden`
    Identifier?: `property "Identifier" is forbidden`
    _op?: `property "_op" is forbidden`
    of?: `property "of" is forbidden`
    context?: `property "context" is forbidden`
    key?: `property "key" is forbidden`
    stack?: `property "stack" is forbidden`
    name?: `property "name" is forbidden`
    pipe?: `property "pipe" is forbidden`
    use?: `property "use" is forbidden`
  }

  /**
   * @since 2.0.0
   * @category Models
   */
  export type AllowedType = (Record<PropertyKey, any> & ProhibitedType) | string | number | symbol

  /**
   * @since 3.9.0
   * @category Models
   */
  export type Proxy<Self, Type> = {
    [
      k in keyof Type as Type[k] extends ((...args: infer Args extends ReadonlyArray<any>) => infer Ret) ?
        ((...args: Readonly<Args>) => Ret) extends Type[k] ? k : never
        : k
    ]: Type[k] extends (...args: infer Args extends ReadonlyArray<any>) => Effect<infer A, infer E, infer R> ?
      (...args: Readonly<Args>) => Effect<A, E, Self | R>
      : Type[k] extends (...args: infer Args extends ReadonlyArray<any>) => Promise<infer A> ?
        (...args: Readonly<Args>) => Effect<A, Cause.UnknownException, Self>
      : Type[k] extends (...args: infer Args extends ReadonlyArray<any>) => infer A ?
        (...args: Readonly<Args>) => Effect<A, never, Self>
      : Type[k] extends Effect<infer A, infer E, infer R> ? Effect<A, E, Self | R>
      : Effect<Type[k], never, Self>
  }
}

const makeTagProxy = (TagClass: Context.Tag<any, any> & Record<PropertyKey, any>) => {
  const cache = new Map()
  return new Proxy(TagClass, {
    get(target: any, prop: any, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      if (cache.has(prop)) {
        return cache.get(prop)
      }
      const fn = (...args: Array<any>) =>
        core.andThen(target, (s: any) => {
          if (typeof s[prop] === "function") {
            cache.set(prop, (...args: Array<any>) => core.andThen(target, (s: any) => s[prop](...args)))
            return s[prop](...args)
          }
          cache.set(prop, core.andThen(target, (s: any) => s[prop]))
          return s[prop]
        })
      const cn = core.andThen(target, (s: any) => s[prop])
      Object.assign(fn, cn)
      Object.setPrototypeOf(fn, Object.getPrototypeOf(cn))
      cache.set(prop, fn)
      return fn
    }
  })
}

/**
 * Creates a unique tag for a dependency, embedding the service's methods as
 * static properties.
 *
 * **Details**
 *
 * This function allows you to define a `Tag` for a service or dependency in
 * your application. The `Tag` not only acts as an identifier but also provides
 * direct access to the service's methods via static properties. This makes it
 * easier to access and use the service in your code without manually managing
 * contexts.
 *
 * In the example below, the fields of the service (in this case, the `notify`
 * method) are turned into static properties of the Notifications class, making
 * it easier to access them.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 *
 * class Notifications extends Effect.Tag("Notifications")<
 *   Notifications,
 *   { readonly notify: (message: string) => Effect.Effect<void> }
 * >() {}
 *
 * // Create an effect that depends on the Notifications service
 * const action = Notifications.notify("Hello, world!")
 * ```
 *
 * @since 2.0.0
 * @category Context
 */
export const Tag: <const Id extends string>(id: Id) => <
  Self,
  Type extends Tag.AllowedType
>() =>
  & Context.TagClass<Self, Id, Type>
  & (Type extends Record<PropertyKey, any> ? Tag.Proxy<Self, Type> : {})
  & {
    use: <X>(
      body: (_: Type) => X
    ) => [X] extends [Effect<infer A, infer E, infer R>] ? Effect<A, E, R | Self>
      : [X] extends [PromiseLike<infer A>] ? Effect<A, Cause.UnknownException, Self>
      : Effect<X, never, Self>
  } = (id) => () => {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 2
    const creationError = new Error()
    Error.stackTraceLimit = limit
    function TagClass() {}
    Object.setPrototypeOf(TagClass, TagProto)
    TagClass.key = id
    Object.defineProperty(TagClass, "use", {
      get() {
        return (body: (_: any) => any) => core.andThen(this, body)
      }
    })
    Object.defineProperty(TagClass, "stack", {
      get() {
        return creationError.stack
      }
    })
    return makeTagProxy(TagClass as any)
  }

/**
 * Simplifies the creation and management of services in Effect by defining both
 * a `Tag` and a `Layer`.
 *
 * **Details**
 *
 * This function allows you to streamline the creation of services by combining
 * the definition of a `Context.Tag` and a `Layer` in a single step. It supports
 * various ways of providing the service implementation:
 * - Using an `effect` to define the service dynamically.
 * - Using `sync` or `succeed` to define the service statically.
 * - Using `scoped` to create services with lifecycle management.
 *
 * It also allows you to specify dependencies for the service, which will be
 * provided automatically when the service is used. Accessors can be optionally
 * generated for the service, making it more convenient to use.
 *
 * @example
 * ```ts
 * import { Effect } from 'effect';
 *
 * class Prefix extends Effect.Service<Prefix>()("Prefix", {
 *  sync: () => ({ prefix: "PRE" })
 * }) {}
 *
 * class Logger extends Effect.Service<Logger>()("Logger", {
 *  accessors: true,
 *  effect: Effect.gen(function* () {
 *    const { prefix } = yield* Prefix
 *    return {
 *      info: (message: string) =>
 *        Effect.sync(() => {
 *          console.log(`[${prefix}][${message}]`)
 *        })
 *    }
 *  }),
 *  dependencies: [Prefix.Default]
 * }) {}
 * ```
 *
 * @since 3.9.0
 * @category Context
 * @experimental might be up for breaking changes
 */
export const Service: <Self>() => {
  <
    const Key extends string,
    const Make extends
      | {
        readonly scoped: Effect<Service.AllowedType<Key, Make>, any, any>
        readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
        readonly accessors?: boolean
        /** @deprecated */
        readonly ಠ_ಠ: never
      }
      | {
        readonly effect: Effect<Service.AllowedType<Key, Make>, any, any>
        readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
        readonly accessors?: boolean
        /** @deprecated */
        readonly ಠ_ಠ: never
      }
      | {
        readonly sync: LazyArg<Service.AllowedType<Key, Make>>
        readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
        readonly accessors?: boolean
        /** @deprecated */
        readonly ಠ_ಠ: never
      }
      | {
        readonly succeed: Service.AllowedType<Key, Make>
        readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
        readonly accessors?: boolean
        /** @deprecated */
        readonly ಠ_ಠ: never
      }
  >(
    key: Key,
    make: Make
  ): Service.Class<Self, Key, Make>
  <
    const Key extends string,
    const Make extends NoExcessProperties<{
      readonly scoped: Effect<Service.AllowedType<Key, Make>, any, any>
      readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
      readonly accessors?: boolean
    }, Make>
  >(
    key: Key,
    make: Make
  ): Service.Class<Self, Key, Make>
  <
    const Key extends string,
    const Make extends NoExcessProperties<{
      readonly effect: Effect<Service.AllowedType<Key, Make>, any, any>
      readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
      readonly accessors?: boolean
    }, Make>
  >(
    key: Key,
    make: Make
  ): Service.Class<Self, Key, Make>
  <
    const Key extends string,
    const Make extends NoExcessProperties<{
      readonly sync: LazyArg<Service.AllowedType<Key, Make>>
      readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
      readonly accessors?: boolean
    }, Make>
  >(
    key: Key,
    make: Make
  ): Service.Class<Self, Key, Make>
  <
    const Key extends string,
    const Make extends NoExcessProperties<{
      readonly succeed: Service.AllowedType<Key, Make>
      readonly dependencies?: ReadonlyArray<Layer.Layer.Any>
      readonly accessors?: boolean
    }, Make>
  >(
    key: Key,
    make: Make
  ): Service.Class<Self, Key, Make>
} = function() {
  return function() {
    const [id, maker] = arguments
    const proxy = "accessors" in maker ? maker["accessors"] : false
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 2
    const creationError = new Error()
    Error.stackTraceLimit = limit

    let patchState: "unchecked" | "plain" | "patched" = "unchecked"
    const TagClass: any = function(this: any, service: any) {
      if (patchState === "unchecked") {
        const proto = Object.getPrototypeOf(service)
        if (proto === Object.prototype || proto === null) {
          patchState = "plain"
        } else {
          const selfProto = Object.getPrototypeOf(this)
          Object.setPrototypeOf(selfProto, proto)
          patchState = "patched"
        }
      }
      if (patchState === "plain") {
        Object.assign(this, service)
      } else if (patchState === "patched") {
        Object.setPrototypeOf(service, Object.getPrototypeOf(this))
        return service
      }
    }

    TagClass.prototype._tag = id
    Object.defineProperty(TagClass, "make", {
      get() {
        return (service: any) => new this(service)
      }
    })
    Object.defineProperty(TagClass, "use", {
      get() {
        return (body: any) => core.andThen(this, body)
      }
    })
    TagClass.key = id

    Object.assign(TagClass, TagProto)

    Object.defineProperty(TagClass, "stack", {
      get() {
        return creationError.stack
      }
    })

    const hasDeps = "dependencies" in maker && maker.dependencies.length > 0
    const layerName = hasDeps ? "DefaultWithoutDependencies" : "Default"
    let layerCache: Layer.Layer.Any | undefined
    if ("effect" in maker) {
      Object.defineProperty(TagClass, layerName, {
        get(this: any) {
          return layerCache ??= layer.fromEffect(TagClass, map(maker.effect, (_) => new this(_)))
        }
      })
    } else if ("scoped" in maker) {
      Object.defineProperty(TagClass, layerName, {
        get(this: any) {
          return layerCache ??= layer.scoped(TagClass, map(maker.scoped, (_) => new this(_)))
        }
      })
    } else if ("sync" in maker) {
      Object.defineProperty(TagClass, layerName, {
        get(this: any) {
          return layerCache ??= layer.sync(TagClass, () => new this(maker.sync()))
        }
      })
    } else {
      Object.defineProperty(TagClass, layerName, {
        get(this: any) {
          return layerCache ??= layer.succeed(TagClass, new this(maker.succeed))
        }
      })
    }

    if (hasDeps) {
      let layerWithDepsCache: Layer.Layer.Any | undefined
      Object.defineProperty(TagClass, "Default", {
        get(this: any) {
          return layerWithDepsCache ??= layer.provide(
            this.DefaultWithoutDependencies,
            maker.dependencies
          )
        }
      })
    }

    return proxy === true ? makeTagProxy(TagClass) : TagClass
  }
}

/**
 * @since 3.9.0
 * @category Context
 */
export declare namespace Service {
  /**
   * @since 3.9.0
   */
  export interface ProhibitedType {
    Service?: `property "Service" is forbidden`
    Identifier?: `property "Identifier" is forbidden`
    Default?: `property "Default" is forbidden`
    DefaultWithoutDependencies?: `property "DefaultWithoutDependencies" is forbidden`
    _op_layer?: `property "_op_layer" is forbidden`
    _op?: `property "_op" is forbidden`
    of?: `property "of" is forbidden`
    make?: `property "make" is forbidden`
    context?: `property "context" is forbidden`
    key?: `property "key" is forbidden`
    stack?: `property "stack" is forbidden`
    name?: `property "name" is forbidden`
    pipe?: `property "pipe" is forbidden`
    use?: `property "use" is forbidden`
    _tag?: `property "_tag" is forbidden`
  }

  /**
   * @since 3.9.0
   */
  export type AllowedType<Key extends string, Make> = MakeAccessors<Make> extends true ?
      & Record<PropertyKey, any>
      & {
        readonly [K in Extract<keyof MakeService<Make>, keyof ProhibitedType>]: K extends "_tag" ? Key
          : ProhibitedType[K]
      }
    : Record<PropertyKey, any> & { readonly _tag?: Key }

  /**
   * @since 3.9.0
   */
  export type Class<
    Self,
    Key extends string,
    Make
  > =
    & {
      new(_: MakeService<Make>): MakeService<Make> & {
        readonly _tag: Key
      }
      readonly use: <X>(
        body: (_: Self) => X
      ) => [X] extends [Effect<infer A, infer E, infer R>] ? Effect<A, E, R | Self>
        : [X] extends [PromiseLike<infer A>] ? Effect<A, Cause.UnknownException, Self>
        : Effect<X, never, Self>
      readonly make: (_: MakeService<Make>) => Self
    }
    & Context.Tag<Self, Self>
    & { key: Key }
    & (MakeAccessors<Make> extends true ? Tag.Proxy<Self, MakeService<Make>> : {})
    & (MakeDeps<Make> extends never ? {
        readonly Default: Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>
      } :
      {
        readonly DefaultWithoutDependencies: Layer.Layer<Self, MakeError<Make>, MakeContext<Make>>
        readonly Default: Layer.Layer<
          Self,
          MakeError<Make> | MakeDepsE<Make>,
          | Exclude<MakeContext<Make>, MakeDepsOut<Make>>
          | MakeDepsIn<Make>
        >
      })

  /**
   * @since 3.9.0
   */
  export type MakeService<Make> = Make extends { readonly effect: Effect<infer _A, infer _E, infer _R> } ? _A
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> } ? _A
    : Make extends { readonly sync: LazyArg<infer A> } ? A
    : Make extends { readonly succeed: infer A } ? A
    : never

  /**
   * @since 3.9.0
   */
  export type MakeError<Make> = Make extends { readonly effect: Effect<infer _A, infer _E, infer _R> } ? _E
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> } ? _E
    : never

  /**
   * @since 3.9.0
   */
  export type MakeContext<Make> = Make extends { readonly effect: Effect<infer _A, infer _E, infer _R> } ? _R
    : Make extends { readonly scoped: Effect<infer _A, infer _E, infer _R> } ? Exclude<_R, Scope.Scope>
    : never

  /**
   * @since 3.9.0
   */
  export type MakeDeps<Make> = Make extends { readonly dependencies: ReadonlyArray<Layer.Layer.Any> }
    ? Make["dependencies"][number]
    : never

  /**
   * @since 3.9.0
   */
  export type MakeDepsOut<Make> = Contravariant.Type<MakeDeps<Make>[Layer.LayerTypeId]["_ROut"]>

  /**
   * @since 3.9.0
   */
  export type MakeDepsE<Make> = Covariant.Type<MakeDeps<Make>[Layer.LayerTypeId]["_E"]>

  /**
   * @since 3.9.0
   */
  export type MakeDepsIn<Make> = Covariant.Type<MakeDeps<Make>[Layer.LayerTypeId]["_RIn"]>

  /**
   * @since 3.9.0
   */
  export type MakeAccessors<Make> = Make extends { readonly accessors: true } ? true
    : false
}

/**
 * @since 3.11.0
 * @category Models
 */
export namespace fn {
  /**
   * @since 3.11.0
   * @category Models
   */
  export type Gen = {
    <Eff extends YieldWrap<Effect<any, any, any>>, AEff, Args extends Array<any>>(
      body: (...args: Args) => Generator<Eff, AEff, never>
    ): (...args: Args) => Effect<
      AEff,
      [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
      [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
    >
    <Eff extends YieldWrap<Effect<any, any, any>>, AEff, Args extends Array<any>, A extends Effect<any, any, any>>(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A
    ): (...args: Args) => A
    <Eff extends YieldWrap<Effect<any, any, any>>, AEff, Args extends Array<any>, A, B extends Effect<any, any, any>>(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B
    ): (...args: Args) => B
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C
    ): (...args: Args) => C
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D
    ): (...args: Args) => D
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D,
      E extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D,
      e: (_: D) => E
    ): (...args: Args) => E
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D,
      E,
      F extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D,
      e: (_: D) => E,
      f: (_: E) => F
    ): (...args: Args) => F
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D,
      E,
      F,
      G extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D,
      e: (_: D) => E,
      f: (_: E) => F,
      g: (_: F) => G
    ): (...args: Args) => G
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D,
      E,
      F,
      G,
      H extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D,
      e: (_: D) => E,
      f: (_: E) => F,
      g: (_: F) => G,
      h: (_: G) => H
    ): (...args: Args) => H
    <
      Eff extends YieldWrap<Effect<any, any, any>>,
      AEff,
      Args extends Array<any>,
      A,
      B,
      C,
      D,
      E,
      F,
      G,
      H,
      I extends Effect<any, any, any>
    >(
      body: (...args: Args) => Generator<Eff, AEff, never>,
      a: (
        _: Effect<
          AEff,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>] ? E : never,
          [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>] ? R : never
        >
      ) => A,
      b: (_: A) => B,
      c: (_: B) => C,
      d: (_: C) => D,
      e: (_: D) => E,
      f: (_: E) => F,
      g: (_: F) => G,
      h: (_: G) => H,
      i: (_: H) => I
    ): (...args: Args) => I
  }

  /**
   * @since 3.11.0
   * @category Models
   */
  export type NonGen = {
    <Eff extends Effect<any, any, any>, Args extends Array<any>>(
      body: (...args: Args) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, E, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => E,
      e: (_: E) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, E, F, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => E,
      e: (_: E) => F,
      f: (_: E) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, E, F, G, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => E,
      e: (_: E) => F,
      f: (_: E) => G,
      g: (_: G) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, E, F, G, H, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => E,
      e: (_: E) => F,
      f: (_: E) => G,
      g: (_: G) => H,
      h: (_: H) => Eff
    ): (...args: Args) => Eff
    <Eff extends Effect<any, any, any>, A, B, C, D, E, F, G, H, I, Args extends Array<any>>(
      body: (...args: Args) => A,
      a: (_: A) => B,
      b: (_: B) => C,
      c: (_: C) => D,
      d: (_: D) => E,
      e: (_: E) => F,
      f: (_: E) => G,
      g: (_: G) => H,
      h: (_: H) => I,
      i: (_: H) => Eff
    ): (...args: Args) => Eff
  }
}

/**
 * Creates a function that returns an Effect, which includes a stack trace
 * with relevant location information if an error occurs and is automatically
 * traced with a span pointing to the call site.
 *
 * The name passed as the first argument is used as a span.
 *
 * The name is optional; if not provided, the span won't be added, but the stack trace will still be present.
 *
 * The function can be created using either a generator function that can yield
 * effects or a normal function that returns an effect.
 *
 * `Effect.fn` also acts as a `pipe` function, allowing you to create a pipeline
 * after the function definition using the effect returned by the generator
 * function as the starting value of the pipeline.
 *
 * @see {@link fnUntraced} for a version of this function that doesn't add a span.
 *
 * @example
 * ```ts
 * // Title: Creating a traced function with a generator function
 * import { Effect } from "effect"
 *
 * const logExample = Effect.fn("logExample")( // Definition location: 4
 *   function*<N extends number>(n: N) {
 *     yield* Effect.annotateCurrentSpan("n", n)
 *     console.log(`got: ${n}`)
 *     yield* Effect.fail(new Error()) // Raise location: 8
 *   }
 * )
 *
 * // Effect.runFork(
 * //   logExample(100).pipe( // Call location: 13
 * //     Effect.catchAllCause(Effect.logError)
 * //   )
 * // )
 * // Output:
 * // got: 100
 * // timestamp=... level=ERROR fiber=#0 cause="Error: An error has occurred
 * //     at <anonymous> (/.../index.ts:8:24) <= Raise location
 * //     at logExample (/.../index.ts:4:27)  <= Definition location
 * //     at logExample (/.../index.ts:13:3)" <= Call location
 * ```
 *
 * @example
 * ```ts
 * // Title: Creating a traced function with a function
 * import { Effect } from "effect"
 *
 * const logExample = Effect.fn("logExample")(
 *   function(n: number) {
 *     console.log(`got: ${n}`)
 *     return Effect.fail(new Error(`An error has occurred`))
 *   }
 * )
 * ```
 *
 * @example
 * ```ts
 * // Title: Creating a traced function and a pipeline
 * import { Effect } from "effect"
 *
 * const logExample = Effect.fn("logExample")(
 *   function(n: number) {
 *     console.log(`got: ${n}`)
 *     return Effect.fail(new Error(`An error has occurred`))
 *   },
 *   // Add a delay to the effect
 *   Effect.delay("1 second")
 * )
 * ```
 *
 * @since 3.11.0
 * @category Tracing
 */
export const fn:
  & fn.Gen
  & fn.NonGen
  & ((
    name: string,
    options?: Tracer.SpanOptions
  ) => fn.Gen & fn.NonGen) = function(nameOrBody: Function | string, ...pipeables: Array<any>) {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 2
    const errorDef = new Error()
    Error.stackTraceLimit = limit
    if (typeof nameOrBody !== "string") {
      return function(this: any, ...args: Array<any>) {
        const limit = Error.stackTraceLimit
        Error.stackTraceLimit = 2
        const errorCall = new Error()
        Error.stackTraceLimit = limit
        return fnApply({
          self: this,
          body: nameOrBody,
          args,
          pipeables,
          spanName: "<anonymous>",
          spanOptions: {
            context: internalTracer.DisablePropagation.context(true)
          },
          errorDef,
          errorCall
        })
      } as any
    }
    const name = nameOrBody
    const options = pipeables[0]
    return (body: Function, ...pipeables: Array<any>) => {
      return function(this: any, ...args: Array<any>) {
        const limit = Error.stackTraceLimit
        Error.stackTraceLimit = 2
        const errorCall = new Error()
        Error.stackTraceLimit = limit
        return fnApply({
          self: this,
          body,
          args,
          pipeables,
          spanName: name,
          spanOptions: options,
          errorDef,
          errorCall
        })
      }
    }
  }

function fnApply(options: {
  readonly self: any
  readonly body: Function
  readonly args: Array<any>
  readonly pipeables: Array<any>
  readonly spanName: string
  readonly spanOptions: Tracer.SpanOptions
  readonly errorDef: Error
  readonly errorCall: Error
}) {
  let effect: Effect<any, any, any>
  let fnError: any = undefined
  if (isGeneratorFunction(options.body)) {
    effect = core.fromIterator(() => options.body.apply(options.self, options.args))
  } else {
    try {
      effect = options.body.apply(options.self, options.args)
    } catch (error) {
      fnError = error
      effect = die(error)
    }
  }
  if (options.pipeables.length > 0) {
    try {
      for (const x of options.pipeables) {
        effect = x(effect)
      }
    } catch (error) {
      effect = fnError
        ? failCause(internalCause.sequential(
          internalCause.die(fnError),
          internalCause.die(error)
        ))
        : die(error)
    }
  }

  let cache: false | string = false
  const captureStackTrace = () => {
    if (cache !== false) {
      return cache
    }
    if (options.errorCall.stack) {
      const stackDef = options.errorDef.stack!.trim().split("\n")
      const stackCall = options.errorCall.stack.trim().split("\n")
      cache = `${stackDef.slice(2).join("\n").trim()}\n${stackCall.slice(2).join("\n").trim()}`
      return cache
    }
  }
  const opts: any = (options.spanOptions && "captureStackTrace" in options.spanOptions)
    ? options.spanOptions
    : { captureStackTrace, ...options.spanOptions }
  return withSpan(effect, options.spanName, opts)
}

/**
 * Same as {@link fn}, but allows you to create a function that is not traced, for when performance is critical.
 *
 * @see {@link fn} for a version that includes tracing.
 *
 * @since 3.12.0
 * @category Tracing
 */
export const fnUntraced: fn.Gen = (body: Function, ...pipeables: Array<any>) =>
  pipeables.length === 0
    ? function(this: any, ...args: Array<any>) {
      return core.fromIterator(() => body.apply(this, args))
    }
    : function(this: any, ...args: Array<any>) {
      let effect = core.fromIterator(() => body.apply(this, args))
      for (const x of pipeables) {
        effect = x(effect)
      }
      return effect
    }
