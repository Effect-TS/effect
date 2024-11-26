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
import type { YieldWrap } from "./Utils.js"

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
 * The `Effect` interface defines a value that lazily describes a workflow or
 * job. The workflow requires some context `R`, and may fail with an error of
 * type `E`, or succeed with a value of type `A`.
 *
 * `Effect` values model resourceful interaction with the outside world,
 * including synchronous, asynchronous, concurrent, and parallel interaction.
 * They use a fiber-based concurrency model, with built-in support for
 * scheduling, fine-grained interruption, structured concurrency, and high
 * scalability.
 *
 * To run an `Effect` value, you need a `Runtime`, which is a type that is
 * capable of executing `Effect` values.
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
 * This function returns `true` if the specified value is an `Effect` value,
 * `false` otherwise.
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Effect` value. For example, you could use
 * `isEffect` to check the type of a value before using it as an argument to a
 * function that expects an `Effect` value.
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const isEffect: (u: unknown) => u is Effect<unknown, unknown, unknown> = core.isEffect

/**
 * Returns an effect that caches its result for a specified duration, known as
 * the `timeToLive`. When the cache expires after the duration, the effect will
 * be recomputed upon next evaluation.
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
 * @category Caching
 */
export const cachedWithTTL: {
  (timeToLive: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<A, E>, never, R>
  <A, E, R>(self: Effect<A, E, R>, timeToLive: Duration.DurationInput): Effect<Effect<A, E>, never, R>
} = circular.cached

/**
 * Similar to {@link cachedWithTTL}, this function caches an effect's result for
 * a specified duration. It also includes an additional effect for manually
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
 * @category Caching
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
 * @category Caching
 */
export const once: <A, E, R>(self: Effect<A, E, R>) => Effect<Effect<void, E, R>> = effect.once

/**
 * Combines multiple effects into one, returning results based on the input
 * structure.
 *
 * **When to Use**
 *
 * Use `Effect.all` when you need to run multiple effects and combine their
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
 * The `Effect.all` function stops execution on the first error it encounters,
 * this is called "short-circuiting". If any effect in the collection fails, the
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
 *
 * @example
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
 * Effect.runPromise(resultsAsTuple).then(console.log)
 * // Output:
 * // 42
 * // Hello
 * // [ 42, 'Hello' ]
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
 * Effect.runPromise(resultsAsArray).then(console.log)
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
 * Effect.runPromise(resultsAsStruct).then(console.log)
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
 * Effect.runPromise(resultsAsRecord).then(console.log)
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
 * Effect.runPromiseExit(program).then(console.log)
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
 * Effect.runPromiseExit(program).then(console.log)
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
 * Effect.runPromiseExit(program).then((result) => console.log("%o", result))
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
 * The `allWith` function enables you to combine multiple effects and customize execution options
 * such as concurrency levels. This version is useful in functional pipelines where you first define
 * your data and then apply operations to it.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#3 message="task2 done"
 * // timestamp=... level=INFO fiber=#2 message="task1 done"
 * // [ 1, 'hello' ]
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
 * Evaluate and run each effect in the structure and collect the results,
 * discarding results from failed effects.
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
 * Drops all elements until the effectful predicate returns true.
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
 * Drops all elements so long as the predicate returns true.
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
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category Condition Checking
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
 * @category Condition Checking
 */
export const exists: {
  <A, E, R>(
    f: (a: A, i: number) => Effect<boolean, E, R>,
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
    f: (a: A, i: number) => Effect<boolean, E, R>,
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
 * Filters the collection using the specified effectful predicate.
 *
 * @since 2.0.0
 * @category Filtering
 */
export const filter: {
  <A, E, R>(
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): (elements: Iterable<A>) => Effect<Array<A>, E, R>
  <A, E, R>(
    elements: Iterable<A>,
    f: (a: NoInfer<A>, i: number) => Effect<boolean, E, R>,
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
 * @see {@link filter} for concurrent filtering without mapping.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // task1 done
 * // task2 done
 * // task3 done
 * // task4 done
 * // [ 2, 4 ]
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
 * @since 2.0.0
 * @category Collecting
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
 * Executes an effectful operation for each element in an `Iterable`.
 *
 * **Details**
 *
 * The `forEach` function applies a provided operation to each element in the
 * iterable, producing a new effect that returns an array of results.
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
 * // Title: Applying Effects to Iterable Elements
 * import { Effect, Console } from "effect"
 *
 * const result = Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
 *   Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2))
 * )
 *
 * Effect.runPromise(result).then(console.log)
 * // Output:
 * // Currently at index 0
 * // Currently at index 1
 * // Currently at index 2
 * // Currently at index 3
 * // Currently at index 4
 * // [ 2, 4, 6, 8, 10 ]
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
 * Effect.runPromise(result).then(console.log)
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
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const head: <A, E, R>(self: Effect<Iterable<A>, E, R>) => Effect<A, Cause.NoSuchElementException | E, R> =
  effect.head

/**
 * Merges an `Iterable<Effect<A, E, R>>` to a single effect, working
 * sequentially.
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
 * The `partition` function processes an iterable and applies an
 * effectful function to each element, categorizing the results into successes
 * and failures.
 *
 * This function returns a tuple where the first part contains all the failures
 * and the second part contains all the successes. It's useful when you need to
 * separate successful outcomes from failures, allowing you to handle them
 * differently. The function allows the entire collection to be processed
 * without halting on failures, and failures are collected in a separate list
 * while the successes are processed normally.
 *
 * @see {@link validateAll} for a function that either collects all failures or all successes.
 * @see {@link validateFirst} for a function that stops at the first success.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log, console.error)
 * // Output:
 * // [ [ '1 is not even', '3 is not even' ], [ 0, 2, 4 ] ]
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
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const reduce: {
  <Z, A, E, R>(zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): (elements: Iterable<A>) => Effect<Z, E, R>
  <A, Z, E, R>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<Z, E, R>): Effect<Z, E, R>
} = effect.reduce

/**
 * Reduces an `Iterable<Effect<A, E, R>>` to a single effect.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const reduceEffect: {
  <Z, E, R, Eff extends Effect<any, any, any>>(
    zero: Effect<Z, E, R>,
    f: (acc: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
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
    f: (acc: NoInfer<Z>, a: Effect.Success<Eff>, i: number) => Z,
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
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @since 2.0.0
 * @category Collecting
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
 * Replicates the given effect `n` times.
 *
 * @since 2.0.0
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
 * Takes elements until the effectual predicate returns true.
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
 * Takes all elements so long as the effectual predicate returns true.
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
 * The `validateAll` function allows you to apply an effectful operation
 * to each element of a collection, while collecting both the successes and
 * failures. Unlike {@link forEach}, which would stop at the first error,
 * `validateAll` continues processing all elements, accumulating both
 * successes and failures.
 *
 * This function transforms all elements of the collection using the provided
 * effectful operation. If any elements fail, the errors are captured and
 * included in the result, alongside the successful results. However, if there
 * are any errors, all successes are lost in the final result, which is an
 * important consideration when using this function.
 *
 * @see {@link forEach} for a similar function that stops at the first error.
 * @see {@link partition} when you need to separate successes and failures instead of losing successes with errors.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * //      ┌─── Effect<number[], string[], never>
 * //      ▼
 * const program = Effect.validateAll([1, 2, 3, 4, 5], (n) => {
 *   if (n < 4) {
 *     return Console.log(`item ${n}`).pipe(Effect.as(n))
 *   } else {
 *     return Effect.fail(`${n} is not less that 4`)
 *   }
 * })
 *
 * Effect.runPromiseExit(program).then(console.log)
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
  ): (elements: Iterable<A>) => Effect<Array<B>, Array<E>, R>
  <A, B, E, R>(
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): (elements: Iterable<A>) => Effect<void, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
      readonly concurrentFinalizers?: boolean | undefined
    } | undefined
  ): Effect<Array<B>, Array<E>, R>
  <A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
      readonly concurrentFinalizers?: boolean | undefined
    }
  ): Effect<void, Array<E>, R>
} = fiberRuntime.validateAll

/**
 * The `validateFirst` function is similar to {@link validateAll} but
 * with a key difference: it returns the first successful result or all errors
 * if none of the operations succeed.
 *
 * This function processes a collection of elements and applies an effectful
 * operation to each. Unlike `validateAll`, which accumulates both
 * successes and failures, `validateFirst` stops and returns the first
 * success it encounters. If no success occurs, it returns all accumulated
 * errors. This can be useful when you are interested in the first successful
 * result and want to avoid processing further once a valid result is found.
 *
 * @see {@link validateAll} for a similar function that accumulates all results.
 * @see {@link firstSuccessOf} for a similar function that processes multiple effects and returns the first successful one or the last error.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log, console.error)
 * // Output:
 * // item 4
 * // 4
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
 * **When to Use**
 *
 * Use `async` when dealing with APIs that use callback-style instead of
 * `async/await` or `Promise`.
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
 * @example
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
 * Effect.runPromise(program)
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
 * Effect.runPromise(program)
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
) => Effect<A, E | E2, R | R2 | R3> = _runtime.asyncEffect

/**
 * Low level constructor that enables for custom stack tracing cutpoints.
 *
 * It is meant to be called with a bag of instructions that become available in
 * the "this" of the effect.
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
 * // Title: Creating a Failed Effect
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<never, Error, never>
 * //      ▼
 * const failure = Effect.fail(
 *   new Error("Operation failed due to network error")
 * )
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const fail: <E>(error: E) => Effect<never, E> = core.fail

/**
 * @since 2.0.0
 * @category Creating Effects
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Effect<never, E> = core.failSync

/**
 * @since 2.0.0
 * @category Creating Effects
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E> = core.failCause

/**
 * @since 2.0.0
 * @category Creating Effects
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Effect<never, E> = core.failCauseSync

/**
 * The `die` function returns an effect that throws a specified error. It
 * is used to terminate a fiber when a defect, a critical and unexpected error,
 * is detected in the code.
 *
 * Note that the error channel type of the effect is `never`, indicating that
 * the effect does not handle failures and will terminate the fiber when an
 * error occurs.
 *
 * @see {@link dieSync} for a variant that throws a specified error, evaluated lazily.
 * @see {@link dieMessage} for a variant that throws a `RuntimeException` with a message.
 *
 * @example
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
 * Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: Cannot divide by zero
 * //   ...stack trace...
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const die: (defect: unknown) => Effect<never> = core.die

/**
 * The `dieMessage` function returns an effect that throws a
 * `RuntimeException` with a specified text message. It is used to terminate a
 * fiber when a defect, a critical and unexpected error, is detected in the
 * code.
 *
 * Note that the error channel type of the effect is `never`, indicating that
 * the effect does not handle failures and will terminate the fiber when an
 * error occurs.
 *
 * @see {@link die} for a variant that throws a specified error.
 * @see {@link dieSync} for a variant that throws a specified error, evaluated lazily.
 *
 * @example
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
 * Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) RuntimeException: Cannot divide by zero
 * //   ...stack trace...
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const dieMessage: (message: string) => Effect<never> = core.dieMessage

/**
 * Creates an effect that dies with the specified error, evaluated lazily.
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
 * `gen` allows you to write code that looks and behaves like synchronous
 * code, but it can handle asynchronous tasks, errors, and complex control flow
 * (like loops and conditions). It helps make asynchronous code more readable
 * and easier to manage.
 *
 * The generator functions work similarly to `async/await` but with more
 * explicit control over the execution of effects. You can `yield*` values from
 * effects and return the final result at the end.
 *
 * @example
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
 * Returns an effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const never: Effect<never> = core.never

/**
 * Requires the option produced by this value to be `None`.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const none: <A, E, R>(
  self: Effect<Option.Option<A>, E, R>
) => Effect<void, E | Cause.NoSuchElementException, R> = effect.none

/**
 * Creates an `Effect` that represents an asynchronous computation guaranteed to
 * succeed.
 *
 * **When to Use**
 *
 * Use `promise` when you are sure the operation will not reject.
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
 * @see {@link tryPromise} for a version that can handle failures.
 *
 * @example
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
 * // Title: Creating a Successful Effect
 * import { Effect } from "effect"
 *
 * // Creating an effect that represents a successful scenario
 * //
 * //      ┌─── Effect<number, never, never>
 * //      ▼
 * const success = Effect.succeed(42)
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeed: <A>(value: A) => Effect<A> = core.succeed

/**
 * Returns an effect which succeeds with `None`.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeedNone: Effect<Option.Option<never>> = effect.succeedNone

/**
 * Returns an effect which succeeds with the value wrapped in a `Some`.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const succeedSome: <A>(value: A) => Effect<Option.Option<A>> = effect.succeedSome

/**
 * Delays the creation of an `Effect` until it is actually needed.
 *
 * **When to Use**
 *
 * Use `suspend` when you need to defer the evaluation of an effect until it is required. This is particularly useful for optimizing expensive computations, managing circular dependencies, or resolving type inference issues.
 *
 * **Details**
 *
 * `suspend` takes a thunk that represents the effect and wraps it in a suspended effect. This means the effect will not be created until it is explicitly needed, which is helpful in various scenarios:
 * - **Lazy Evaluation**: Helps optimize performance by deferring computations, especially when the effect might not be needed, or when its computation is expensive. This also ensures that any side effects or scoped captures are re-executed on each invocation.
 * - **Handling Circular Dependencies**: Useful in managing circular dependencies, such as recursive functions that need to avoid eager evaluation to prevent stack overflow.
 * - **Unifying Return Types**: Can help TypeScript unify return types in situations where multiple branches of logic return different effects, simplifying type inference.
 *
 * @example
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
 * **When to Use**
 *
 * Use `sync` when you are sure the operation will not fail.
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
 * @see {@link try_ | try} for a version that can handle failures.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const sync: <A>(thunk: LazyArg<A>) => Effect<A> = core.sync

const _void: Effect<void> = core.void
export {
  /**
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
   * Recovers from specified error.
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
 * The `catchAll` function catches any errors that may occur during the
 * execution of an effect and allows you to handle them by specifying a fallback
 * effect. This ensures that the program continues without failing by recovering
 * from errors using the provided fallback logic.
 *
 * **Note**: `catchAll` only handles recoverable errors. It will not recover
 * from unrecoverable defects.
 *
 * @see {@link catchAllCause} for a version that can recover from both recoverable and unrecoverable errors.
 *
 * @example
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
 * Effect.runPromise(recovered).then(console.log)
 * // Output: "Recovered from a regular error"
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
 * Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // RuntimeException defect caught: Boom!
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: undefined
 * // }
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
 * Recovers from some or all of the error cases with provided cause.
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
 * `catchSomeDefect` allows you to handle specific defects, which are
 * unexpected errors that can cause the program to stop. It uses a partial
 * function to catch only certain defects and ignores others. The function does
 * not handle expected errors (such as those caused by {@link fail}) or
 * interruptions in execution (like those caused by {@link interrupt}).
 *
 * This function provides a way to handle certain types of defects while
 * allowing others to propagate and cause failure in the program.
 *
 * **Important**: `catchSomeDefect` is designed for handling defects and not
 * expected errors or interruptions.
 *
 * **Note**: There is no sensible way to recover from defects. This method
 * should be used only at the boundary between Effect and an external system, to
 * transmit information on a defect for diagnostic or explanatory purposes.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
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
 * The `cause` function allows you to expose the detailed cause of an
 * effect, which includes a more precise representation of failures, such as
 * error messages and defects.
 *
 * This function is helpful when you need to inspect the cause of a failure in
 * an effect, giving you more information than just the error message. It can be
 * used to log, handle, or analyze failures in more detail, including
 * distinguishing between different types of defects (e.g., runtime exceptions,
 * interruptions, etc.).
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Error handling
 */
export const cause: <A, E, R>(self: Effect<A, E, R>) => Effect<Cause.Cause<E>, never, R> = effect.cause

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @since 2.0.0
 * @category Error handling
 */
export const eventually: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = effect.eventually

/**
 * Discards both the success and failure values of an effect.
 *
 * `ignore` allows you to run an effect without caring about its result,
 * whether it succeeds or fails. This is useful when you only care about the
 * side effects of the effect and do not need to handle or process its outcome.
 *
 * @example
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const task = Effect.fail("Uh oh!").pipe(Effect.as(5))
 *
 * //      ┌─── Effect<void, never, never>
 * //      ▼
 * const program = Effect.ignore(task)
 *
 * @since 2.0.0
 * @category Error handling
 */
export const ignore: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignore

/**
 * Returns a new effect that ignores the success or failure of this effect,
 * but which also logs failures at the Debug level, just in case the failure
 * turns out to be important.
 *
 * @since 2.0.0
 * @category Error handling
 */
export const ignoreLogged: <A, E, R>(self: Effect<A, E, R>) => Effect<void, never, R> = effect.ignoreLogged

/**
 * The `parallelErrors` function captures all failure errors from
 * concurrent operations and combines them into a single error in the error
 * channel.
 *
 * This function is useful when you are running multiple operations concurrently
 * and you want to gather all the errors that occur. Instead of handling each
 * error separately, `parallelErrors` consolidates them into one, making
 * it easier to manage and respond to errors from multiple operations at once.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Fail', failure: [ 'Oh uh!', 'Oh no!' ] }
 * // }
 *
 * @since 2.0.0
 * @category Error handling
 */
export const parallelErrors: <A, E, R>(self: Effect<A, E, R>) => Effect<A, Array<E>, R> = effect.parallelErrors

/**
 * The `sandbox` function transforms an effect by exposing the full cause
 * of any error, defect, or fiber interruption that might occur during its
 * execution. It changes the error channel of the effect to include detailed
 * information about the cause, which is wrapped in a `Cause<E>` type.
 *
 * This function is useful when you need access to the complete underlying cause
 * of failures, defects, or interruptions, enabling more detailed error
 * handling. Once you apply `sandbox`, you can use operators like
 * {@link catchAll} and {@link catchTags} to handle specific error conditions.
 * If necessary, you can revert the sandboxing operation with {@link unsandbox}
 * to return to the original error handling behavior.
 *
 * @see {@link unsandbox} to restore the original error handling.
 *
 * @example
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
 * Effect.runPromise(main).then(console.log)
 * // Output:
 * // Caught a defect: Oh uh!
 * // fallback result on failure
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
 * The `retry` function allows you to retry a failing effect multiple
 * times according to a specified policy. This can be useful when dealing with
 * intermittent failures, such as network issues or temporary resource
 * unavailability. By defining a retry policy, you can control the number of
 * retries, the delay between them, and when to stop retrying.
 *
 * The `retry` function takes an effect and a policy, and will automatically
 * retry the effect if it fails, following the rules of the policy. If the
 * effect ultimately succeeds, the result will be returned. If the maximum
 * retries are exhausted and the effect still fails, the failure is propagated.
 *
 * @see {@link retryOrElse} for a version that allows you to run a fallback.
 *
 * @example
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
 * Effect.runPromise(repeated).then(console.log)
 * // Output:
 * // failure
 * // failure
 * // failure
 * // success
 * // yay!
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
} = _schedule.retry_combined

/**
 * Retries a failing effect and runs a fallback effect if retries are exhausted.
 *
 * The `retryOrElse` function attempts to retry a failing effect multiple
 * times according to a defined retry policy. If the retries are exhausted and
 * the effect still fails, it runs a fallback effect instead. This function is
 * useful when you want to handle failures gracefully by specifying an
 * alternative action after repeated failures.
 *
 * @see {@link retry} for a version that does not run a fallback effect.
 *
 * @example
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
 * const repeated = Effect.retryOrElse(task, policy, () =>
 *   Console.log("orElse").pipe(Effect.as("default value"))
 * )
 *
 * Effect.runPromise(repeated).then(console.log)
 * // Output:
 * // failure
 * // failure
 * // failure
 * // orElse
 * // default value
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
} = _schedule.retryOrElse_Effect

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
 * Returns an effect whose success is mapped by the specified side effecting
 * `try` function, translating any promise rejections into typed failed effects
 * via the `catch` function.
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
 * Returns an effect whose success is mapped by the specified side effecting
 * `try` function, translating any promise rejections into typed failed effects
 * via the `catch` function.
 *
 * An optional `AbortSignal` can be provided to allow for interruption of the
 * wrapped `Promise` API.
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
 * This function checks if any fibers are attempting to interrupt the current
 * fiber, and if so, performs self-interruption.
 *
 * Note that this allows for interruption to occur in uninterruptible regions.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const allowInterrupt: Effect<void> = effect.allowInterrupt

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @since 2.0.0
 * @category Interruption
 */
export const checkInterruptible: <A, E, R>(f: (isInterruptible: boolean) => Effect<A, E, R>) => Effect<A, E, R> =
  core.checkInterruptible

/**
 * Provides a way to handle timeouts in uninterruptible effects, allowing them
 * to continue in the background while the main control flow proceeds with the
 * timeout error.
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
 * @see {@link Effect.timeout} for a version that interrupts the effect.
 * @see {@link Effect.uninterruptible} for creating an uninterruptible effect.
 *
 * @example
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
 * Effect.runPromiseExit(timedEffect).then(console.log)
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
 *
 * @since 2.0.0
 * @category Interruption
 */
export const disconnect: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = fiberRuntime.disconnect

/**
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
 * @since 2.0.0
 * @category Interruption
 */
export const interruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.interruptible

/**
 * @since 2.0.0
 * @category Interruption
 */
export const interruptibleMask: <A, E, R>(
  f: (restore: <AX, EX, RX>(effect: Effect<AX, EX, RX>) => Effect<AX, EX, RX>) => Effect<A, E, R>
) => Effect<A, E, R> = core.interruptibleMask

/**
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
 * @since 2.0.0
 * @category Interruption
 */
export const uninterruptible: <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R> = core.uninterruptible

/**
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
 * `as` allows you to ignore the original value inside an effect and
 * replace it with a new constant value.
 *
 * @example
 * // Title: Replacing a Value
 * import { pipe, Effect } from "effect"
 *
 * // Replaces the value 5 with the constant "new value"
 * const program = pipe(Effect.succeed(5), Effect.as("new value"))
 *
 * Effect.runPromise(program).then(console.log)
 * // Output: "new value"
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
 * The `flip` function swaps the success and error channels of an effect,
 * so that the success becomes the error, and the error becomes the success.
 *
 * This function is useful when you need to reverse the flow of an effect,
 * treating the previously successful values as errors and vice versa. This can
 * be helpful in scenarios where you want to handle a success as a failure or
 * treat an error as a valid result.
 *
 * @example
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const program = Effect.fail("Oh uh!").pipe(Effect.as(2))
 *
 * //      ┌─── Effect<string, number, never>
 * //      ▼
 * const flipped = Effect.flip(program)
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
 * Effect.runPromise(finalAmount).then(console.log)
 * // Output: 101
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
 * Effect.runPromise(program).then(([finalState, transformedCollection]) => {
 *   console.log(finalState)
 *   console.log(transformedCollection)
 * })
 * // Output:
 * // 6
 * // [ 'A', 'BB', 'CCC' ]
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
 * The `mapBoth` function allows you to apply transformations to both the
 * error and success channels of an effect.
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
 * The `mapError` function is used to transform or modify the error
 * produced by an effect, without affecting its success value.
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
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (e: E) => E2): Effect<A, E2, R>
} = core.mapError

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the original
 * structure of `Cause`.
 *
 * See `sandbox`, `catchAllCause` for other functions for dealing with defects.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<A, E2, R>
} = effect.mapErrorCause

/**
 * The `merge` function combines both the error and success channels of
 * an effect, creating a new effect that never fails.
 *
 * This function transforms an effect that may fail into one that always returns
 * a value, where both success and failure outcomes are handled as values in the
 * success channel. This can be useful when you want to continue execution
 * regardless of the error type and still capture both successful results and
 * errors as part of the outcome.
 *
 * @example
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, string, never>
 * //      ▼
 * const program = Effect.fail("Oh uh!").pipe(Effect.as(2))
 *
 * //      ┌─── Effect<number | string, never, never>
 * //      ▼
 * const recovered = Effect.merge(program)
 *
 * @since 2.0.0
 * @category Mapping
 */
export const merge: <A, E, R>(self: Effect<A, E, R>) => Effect<E | A, never, R> = effect.merge

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const negate: <E, R>(self: Effect<boolean, E, R>) => Effect<boolean, E, R> = effect.negate

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
 * @category Creating Effects
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

/**
 * Retreives the `Console` service from the context
 *
 * @since 2.0.0
 * @category Console
 */
export const console: Effect<Console> = _console.console

/**
 * Retreives the `Console` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category Console
 */
export const consoleWith: <A, E, R>(f: (console: Console) => Effect<A, E, R>) => Effect<A, E, R> = _console.consoleWith

/**
 * Sets the implementation of the console service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category Creating Effects
 */
export const withConsoleScoped: <A extends Console>(console: A) => Effect<void, never, Scope.Scope> =
  _console.withConsoleScoped

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
} = _console.withConsole

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
 * Adds a time limit to an effect, triggering a timeout if the effect exceeds
 * the duration.
 *
 * The `timeout` function allows you to specify a time limit for an
 * effect's execution. If the effect does not complete within the given time, a
 * `TimeoutException` is raised. This can be useful for controlling how long
 * your program waits for a task to finish, ensuring that it doesn't hang
 * indefinitely if the task takes too long.
 *
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and timeout handlers.
 *
 * @example
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
 * Effect.runPromiseExit(timedEffect).then(console.log)
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
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeout: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E | Cause.TimeoutException, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<A, Cause.TimeoutException | E, R>
} = circular.timeout

/**
 * Handles timeouts by returning an `Option` that represents either the result
 * or a timeout.
 *
 * The `timeoutOption` function provides a way to gracefully handle
 * timeouts by wrapping the outcome of an effect in an `Option` type. If the
 * effect completes within the specified time, it returns a `Some` containing
 * the result. If the effect times out, it returns a `None`, allowing you to
 * treat the timeout as a regular result instead of throwing an error.
 *
 * This is useful when you want to handle timeouts without causing the program
 * to fail, making it easier to manage situations where you expect tasks might
 * take too long but want to continue executing other tasks.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and timeout handlers.
 *
 * @example
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
 * Effect.runPromise(timedOutEffect).then(console.log)
 * // Output:
 * // Start processing...
 * // Processing complete.
 * // Start processing...
 * // [
 * //   { _id: 'Option', _tag: 'Some', value: 'Result' },
 * //   { _id: 'Option', _tag: 'None' }
 * // ]
 *
 * @since 3.1.0
 * @category delays & timeouts
 */
export const timeoutOption: {
  (duration: Duration.DurationInput): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, duration: Duration.DurationInput): Effect<Option.Option<A>, E, R>
} = circular.timeoutOption

/**
 * The `timeoutFail` function allows you to specify a custom error to be
 * produced when a timeout occurs during the execution of an effect.
 *
 * This function enables you to handle timeouts by triggering a specific error,
 * providing more control over the behavior of your program when time limits are
 * exceeded. Instead of using a default timeout error, you can define your own
 * error type and use it to represent the timeout situation in a more meaningful
 * way.
 *
 * When you apply `timeoutFail`, you define a duration after which the
 * effect will timeout. If the effect does not complete in the specified time,
 * the `onTimeout` function will be executed to generate the custom error.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 * @see {@link timeoutTo} for a version that allows specifying both success and timeout handlers.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
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
 * The `timeoutFailCause` function allows you to specify a custom defect
 * to be thrown when a timeout occurs during the execution of an effect.
 *
 * This function helps in handling timeouts as exceptional cases in your program
 * by generating a custom defect when the operation exceeds the specified time
 * limit. You can define a `duration` and a `onTimeout` function that produces a
 * defect (typically using `Cause.die`) which will be thrown instead of a
 * default timeout error.
 *
 * This is particularly useful when you need to treat timeouts as critical
 * failures in your application, allowing for more precise error handling.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutTo} for a version that allows specifying both success and timeout handlers.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Die', defect: 'Timed out!' }
 * // }
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
 * The `timeoutTo` function provides more flexibility than
 * `timeout` by allowing you to define different outcomes for both
 * successful and timed-out operations.
 *
 * This function is useful when you want to handle the results of an effect
 * differently depending on whether the operation completes within the given
 * time frame or not. It lets you specify `onSuccess` and `onTimeout` handlers,
 * where the success handler processes the result if the effect completes on
 * time, and the timeout handler handles the scenario where the effect exceeds
 * the specified duration.
 *
 * `timeoutTo` can be used to customize the result of an effect,
 * particularly when you need to handle success and timeouts in distinct ways,
 * such as using the `Either` data type to distinguish between successful
 * results and timeouts.
 *
 * @see {@link timeout} for a version that raises a `TimeoutException`.
 * @see {@link timeoutFail} for a version that raises a custom error.
 * @see {@link timeoutFailCause} for a version that raises a custom defect.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // Start processing...
 * // {
 * //   _id: "Either",
 * //   _tag: "Left",
 * //   left: "Timed out!"
 * // }
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

/**
 * Retrieves the default config provider, and passes it to the specified
 * function, which may return an effect that uses the provider to perform some
 * work or compute some value.
 *
 * @since 2.0.0
 * @category Config
 */
export const configProviderWith: <A, E, R>(f: (configProvider: ConfigProvider) => Effect<A, E, R>) => Effect<A, E, R> =
  defaultServices.configProviderWith

/**
 * Executes the specified workflow with the specified configuration provider.
 *
 * @since 2.0.0
 * @category Config
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
 * @category Config
 */
export const withConfigProviderScoped: (value: ConfigProvider) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withConfigProviderScoped

/**
 * @since 2.0.0
 * @category Context
 */
export const context: <R>() => Effect<Context.Context<R>, never, R> = core.context

/**
 * Accesses the context of the effect.
 *
 * @since 2.0.0
 * @category Context
 */
export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<A, never, R> = effect.contextWith

/**
 * Effectually accesses the context of the effect.
 *
 * @since 2.0.0
 * @category Context
 */
export const contextWithEffect: <R0, A, E, R>(
  f: (context: Context.Context<R0>) => Effect<A, E, R>
) => Effect<A, E, R | R0> = core.contextWithEffect

/**
 * Provides some of the context required to run this effect,
 * leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category Context
 */
export const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <A, E>(self: Effect<A, E, R>) => Effect<A, E, R0>
  <A, E, R, R0>(self: Effect<A, E, R>, f: (context: Context.Context<R0>) => Context.Context<R>): Effect<A, E, R0>
} = core.mapInputContext

/**
 * Provides the necessary `Layer`s to an effect, removing its dependency on the
 * environment.
 *
 * You can pass multiple layers, a `Context`, `Runtime`, or `ManagedRuntime` to
 * the effect.
 *
 * @see {@link provideService} for providing a service to an effect.
 *
 * @example
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
 * Effect.runPromise(runnable).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="Executing query: SELECT * FROM users"
 * // []
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
 * The `provideService` function is used to provide an actual
 * implementation for a service in the context of an effect.
 *
 * This function allows you to associate a service with its implementation so
 * that it can be used in your program. You define the service (e.g., a random
 * number generator), and then you use `provideService` to link that
 * service to its implementation. Once the implementation is provided, the
 * effect can be run successfully without further requirements.
 *
 * @see {@link provide} for providing multiple layers to an effect.
 *
 * @example
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
 * Effect.runPromise(runnable)
 * // Example Output:
 * // random number: 0.8241872233134417
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
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provide` instead.
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
 * @since 2.0.0
 * @category Context
 */
export const serviceFunction: <T extends Effect<any, any, any>, Args extends Array<any>, A>(
  getService: T,
  f: (_: Effect.Success<T>) => (...args: Args) => A
) => (...args: Args) => Effect<A, Effect.Error<T>, Effect.Context<T>> = effect.serviceFunction

/**
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
 * @since 2.0.0
 * @category Context
 */
export const serviceOption: <I, S>(tag: Context.Tag<I, S>) => Effect<Option.Option<S>> = effect.serviceOption

/**
 * @since 2.0.0
 * @category Context
 */
export const serviceOptional: <I, S>(tag: Context.Tag<I, S>) => Effect<S, Cause.NoSuchElementException> =
  effect.serviceOptional

/**
 * Updates the service with the required service entry.
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
   * @category Do notation
   * @since 2.0.0
   */
  let_ as let
}

/**
 * Transforms an `Effect` into one that encapsulates both success and failure
 * using the `Either` data type.
 *
 * **Details**
 *
 * `either` takes an effect that could potentially fail and converts it
 * into an effect that always succeeds but with the result inside an `Either`.
 * The `Either` can either be a `Left` (representing failure) or a `Right`
 * (representing success). This allows you to handle both cases explicitly
 * without causing the effect to fail.
 *
 * The resulting effect cannot fail because failure is now represented inside
 * the `Either` type.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const either: <A, E, R>(self: Effect<A, E, R>) => Effect<Either.Either<A, E>, never, R> = core.either

/**
 * Transforms an effect to encapsulate both failure and success using the `Exit`
 * data type.
 *
 * **Details**
 *
 * `exit` wraps an effect's success or failure inside an `Exit` type, allowing
 * you to handle both cases explicitly.
 *
 * The resulting effect cannot fail because the failure is encapsulated within
 * the `Exit.Failure` type. The error type is set to `never`, indicating that
 * the effect is structured to never fail directly.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
 * // Output:
 * // RuntimeException defect caught: Boom!
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: undefined
 * // }
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const exit: <A, E, R>(self: Effect<A, E, R>) => Effect<Exit.Exit<A, E>, never, R> = core.exit

/**
 * Transforms an effect to encapsulate both failure and success using the
 * `Option` data type.
 *
 * **Details**
 *
 * The `option` function wraps the success or failure of an effect within the
 * `Option` type, making both cases explicit. If the original effect succeeds,
 * its value is wrapped in `Option.some`. If it fails, the failure is mapped to
 * `Option.none`.
 *
 * The resulting effect cannot fail directly, as the error type is set to
 * `never`. However, fatal errors like defects are not encapsulated.
 *
 * @example
 * // Title: Using Effect.option to Handle Errors
 * import { Effect } from "effect"
 *
 * const maybe1 = Effect.option(Effect.succeed(1))
 *
 * Effect.runPromiseExit(maybe1).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Success',
 * //   value: { _id: 'Option', _tag: 'Some', value: 1 }
 * // }
 *
 * const maybe2 = Effect.option(Effect.fail("Uh oh!"))
 *
 * Effect.runPromiseExit(maybe2).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Success',
 * //   value: { _id: 'Option', _tag: 'None' }
 * // }
 *
 * const maybe3 = Effect.option(Effect.die("Boom!"))
 *
 * Effect.runPromiseExit(maybe3).then(console.log)
 * // Output:
 * // {
 * //   _id: 'Exit',
 * //   _tag: 'Failure',
 * //   cause: { _id: 'Cause', _tag: 'Die', defect: 'Boom!' }
 * // }
 *
 * @since 2.0.0
 * @category Outcome Encapsulation
 */
export const option: <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, never, R> = effect.option

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
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // 42
 * // true
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
   * // Title: Simulating a Coin Flip
   * import { Effect, Random, Console } from "effect"
   *
   * const flipTheCoin = Effect.if(Random.nextBoolean, {
   *   onTrue: () => Console.log("Head"), // Runs if the predicate is true
   *   onFalse: () => Console.log("Tail") // Runs if the predicate is false
   * })
   *
   * Effect.runFork(flipTheCoin)
   *
   * @since 2.0.0
   * @category Conditional Operators
   */
  if_ as if
}

/**
 * Filter the specified effect with the provided function, dying with specified
 * defect if the predicate fails.
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
 * Filter the specified effect with the provided function, dying with specified
 * message if the predicate fails.
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
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
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
 * Filter the specified effect with the provided function, failing with
 * specified error if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the
 * option to further refine and narrow down the type of the success channel by
 * providing a [user-defined type
 * guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).
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
 *
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
 *
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
 * `when` allows you to conditionally execute an effect, similar to using an `if
 * (condition)` expression, but with the added benefit of handling effects. If
 * the condition is `true`, the effect is executed; otherwise, it does nothing.
 *
 * The result of the effect is wrapped in an `Option<A>` to indicate whether the
 * effect was executed. If the condition is `true`, the result of the effect is
 * wrapped in a `Some`. If the condition is `false`, the result is `None`,
 * representing that the effect was skipped.
 *
 * @see {@link whenEffect} for a version that allows the condition to be an effect.
 * @see {@link unless} for a version that executes the effect when the condition is `false`.
 *
 * @example
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
 * Effect.runPromise(validateWeightOption(100)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Option",
 * //   _tag: "Some",
 * //   value: 100
 * // }
 *
 * // Run with an invalid weight
 * Effect.runPromise(validateWeightOption(-5)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Option",
 * //   _tag: "None"
 * // }
 *
 * @since 2.0.0
 * @category Conditional Operators
 */
export const when: {
  (condition: LazyArg<boolean>): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
  <A, E, R>(self: Effect<A, E, R>, condition: LazyArg<boolean>): Effect<Option.Option<A>, E, R>
} = effect.when

/**
 * Executes an effect conditionally, based on the result of another effect.
 *
 * Use `whenEffect` when the condition to determine whether to execute the effect
 * depends on the outcome of another effect that produces a boolean value.
 *
 * If the condition effect evaluates to `true`, the specified effect is executed.
 * If it evaluates to `false`, no effect is executed.
 *
 * The result of the effect is wrapped in an `Option<A>` to indicate whether the
 * effect was executed. If the condition is `true`, the result of the effect is
 * wrapped in a `Some`. If the condition is `false`, the result is `None`,
 * representing that the effect was skipped.
 *
 * @see {@link when} for a version that allows the condition to be a boolean.
 * @see {@link unlessEffect} for a version that executes the effect when the condition is `false`.
 *
 * @example
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
 * Executes this workflow when value of the specified `FiberRef` satisfies the
 * predicate.
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
 * Executes this workflow when the value of the `Ref` satisfies the predicate.
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
 * **When to Use**
 *
 * Use `flatMap` when you need to chain multiple effects, ensuring that each
 * step produces a new `Effect` while flattening any nested effects that may
 * occur.
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
 * @example
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
 * Effect.runPromise(finalAmount).then(console.log)
 * // Output: 95
 *
 * @since 2.0.0
 * @category sequencing
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
 * Effect.runPromise(result1).then(console.log)
 * // Output: 190
 *
 * // Using Effect.andThen
 * const result2 = pipe(
 *   fetchTransactionAmount,
 *   Effect.andThen((amount) => amount * 2),
 *   Effect.andThen((amount) => applyDiscount(amount, 5))
 * )
 *
 * Effect.runPromise(result2).then(console.log)
 * // Output: 190
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
 * Runs a side effect with the result of an effect without changing the original
 * value.
 *
 * **When to Use**
 *
 * Use `tap` when you want to perform a side effect, like logging or tracking,
 * without modifying the main value. This is useful when you need to observe or
 * record an action but want the original value to be passed to the next step.
 *
 * **Details**
 *
 * `tap` works similarly to `flatMap`, but it ignores the result of the function
 * passed to it. The value from the previous effect remains available for the
 * next part of the chain. Note that if the side effect fails, the entire chain
 * will fail too.
 *
 * @example
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
 * Effect.runPromise(finalAmount).then(console.log)
 * // Output:
 * // Apply a discount to: 100
 * // 95
 *
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
 * The `tapBoth` function allows you to inspect both the success and
 * failure outcomes of an effect, performing different actions based on the
 * result.
 *
 * This function is useful when you need to handle both successful results and
 * failures separately, allowing for side effects such as logging, metrics
 * collection, or conditional actions based on whether the effect succeeded or
 * failed. It provides a way to react to the outcome of an effect without
 * altering the result.
 *
 * @example
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
 * The `tapDefect` function specifically inspects non-recoverable
 * failures or defects (i.e., one or more `Die` causes) in an effect.
 *
 * This function is designed to catch severe errors in your program that
 * represent critical issues, like system failures or unexpected errors
 * (defects). It helps you log or handle these defects without altering the main
 * result of the effect, allowing for efficient debugging or monitoring of
 * severe errors.
 *
 * @example
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
 * Effect.runFork(tapping1)
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
 * The `tapError` function executes an effectful operation to inspect the
 * failure of an effect without modifying it.
 *
 * This function is useful when you want to perform some side effect (like
 * logging or tracking) on the failure of an effect, but without changing the
 * result of the effect itself. The error remains in the effect's error channel,
 * while the operation you provide can inspect or act on it.
 *
 * @example
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
 * The `tapErrorTag` function allows you to inspect errors that match a
 * specific tag, helping you handle different error types more precisely.
 *
 * This function is useful when you want to target and act on specific error
 * types within an effect. You can use it to handle errors more granularly based
 * on their tags (e.g., inspecting only `NetworkError` or `ValidationError`),
 * without modifying the error or the overall result of the effect.
 *
 * @example
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
    f: (e: NoInfer<Extract<E, { _tag: K }>>) => Effect<A1, E1, R1>
  ): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E1, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, A1, E1, R1>(
    self: Effect<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1>
} = effect.tapErrorTag

/**
 * The `tapErrorCause` function allows you to inspect the complete cause
 * of an error, including failures and defects.
 *
 * This function is helpful when you need to log, monitor, or handle specific
 * error causes in your effects. It gives you access to the full error cause,
 * whether it’s a failure, defect, or other exceptional conditions, without
 * altering the error or the overall result of the effect.
 *
 * @example
 * import { Effect, Console } from "effect"
 *
 * // Create a task that fails with a NetworkError
 * const task1: Effect.Effect<number, string> = Effect.fail("NetworkError")
 *
 * const tapping1 = Effect.tapErrorCause(task1, (cause) =>
 *   Console.log(`error cause: ${cause}`)
 * )
 *
 * Effect.runFork(tapping1)
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

/**
 * Repeats this effect forever (until the first error).
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const forever: <A, E, R>(self: Effect<A, E, R>) => Effect<never, E, R> = effect.forever

/**
 * Repeatedly updates a state through an effectful operation, running the `body`
 * effect to update the state in each iteration. It continues iterating as long
 * as the `while` condition evaluates to `true`.
 *
 * This function works like a `while` loop in JavaScript but with effectful
 * operations:
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
 * @example
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
 * Effect.runPromise(result).then(console.log)
 * // Output: 6
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
 * Repeatedly updates a state using a `step` function until a condition, defined
 * by the `while` function, becomes `false`. It collects the intermediate states
 * in an array and returns them as the final result. The loop executes effectful
 * operations at each iteration.
 *
 * This function is similar to a `while` loop in JavaScript, with the addition
 * of effectful computations:
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
 * **Discarding Intermediate Results**
 *
 * If the `discard` option is set to `true`, the intermediate results are
 * discarded, and the final result will be `void`.
 *
 * @example
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
 * Effect.runPromise(result).then(console.log)
 * // Output: [1, 2, 3, 4, 5]
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
 * Effect.runPromise(result).then(console.log)
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
 * recurrences are in addition to the initial execution, so `repeat(action,
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
 * to the initial execution, so `repeatN(action, 1)` executes `action` once
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
 * execution, so `repeat(action, Schedule.once)` executes `action` once
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

/**
 * Returns `true` if this effect is a failure, `false` otherwise.
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const isFailure: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isFailure

/**
 * Returns `true` if this effect is a success, `false` otherwise.
 *
 * @since 2.0.0
 * @category Condition Checking
 */
export const isSuccess: <A, E, R>(self: Effect<A, E, R>) => Effect<boolean, never, R> = effect.isSuccess

/**
 * Handles both success and failure cases of an effect without performing side
 * effects.
 *
 * `match` lets you define custom handlers for both success and failure
 * scenarios. You provide separate functions to handle each case, allowing you
 * to process the result if the effect succeeds, or handle the error if the
 * effect fails. This is useful for structuring your code to respond differently
 * to success or failure without triggering side effects.
 *
 * @see {@link matchEffect} if you need to perform side effects in the handlers.
 *
 * @example
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
 * Effect.runPromise(program1).then(console.log)
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
 * Effect.runPromise(program2).then(console.log)
 * // Output: "failure: Uh oh!"
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
 * Handles failures by matching the cause of failure.
 *
 * The `matchCause` function allows you to handle failures with access to
 * the full cause of the failure within a fiber. This is useful for
 * differentiating between different types of errors, such as regular failures,
 * defects, or interruptions. You can provide specific handling logic for each
 * failure type based on the cause.
 *
 * @see {@link matchCauseEffect} if you need to perform side effects in the handlers.
 * @see {@link match} if you don't need to handle the cause of the failure.
 *
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
 * Handles failures with access to the cause and allows performing side effects.
 *
 * The `matchCauseEffect` function works similarly to {@link matchCause},
 * but it also allows you to perform additional side effects based on the
 * failure cause. This function provides access to the complete cause of the
 * failure, making it possible to differentiate between various failure types,
 * and allows you to respond accordingly while performing side effects (like
 * logging or other operations).
 *
 * @see {@link matchCause} if you don't need side effects and only want to handle the result or failure.
 * @see {@link matchEffect} if you don't need to handle the cause of the failure.
 *
 * @example
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
 * Effect.runSync(program)
 * // Output: "Die: Uh oh!"
 *
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
 * Handles both success and failure cases of an effect, allowing for additional
 * side effects.
 *
 * The `matchEffect` function is similar to {@link match}, but it
 * enables you to perform side effects in the handlers for both success and
 * failure outcomes. This is useful when you need to execute additional actions,
 * like logging or notifying users, based on whether an effect succeeds or
 * fails.
 *
 * @see {@link match} if you don't need side effects and only want to handle the result or failure.
 *
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

/**
 * Logs one or more messages or error causes at the current log level, which is INFO by default.
 * This function allows logging multiple items at once and can include detailed error information using `Cause` instances.
 *
 * To adjust the log level, use the `Logger.withMinimumLogLevel` function.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Logging
 */
export const log: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.log

/**
 * Logs the specified message or cause at the specified log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logWithLevel = (
  level: LogLevel,
  ...message: ReadonlyArray<any>
): Effect<void> => effect.logWithLevel(level)(...message)

/**
 * Logs the specified message or cause at the Trace log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logTrace: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logTrace

/**
 * Logs the specified messages at the DEBUG log level.
 * DEBUG messages are not shown by default.
 *
 * To view DEBUG messages, adjust the logging settings using
 * `Logger.withMinimumLogLevel` and set the log level to `LogLevel.Debug`.
 *
 * @example
 * import { Effect, Logger, LogLevel } from "effect"
 *
 * const program = Effect.logDebug("message1").pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=DEBUG fiber=#0 message=message1
 *
 * @since 2.0.0
 * @category Logging
 */
export const logDebug: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logDebug

/**
 * Logs the specified message or cause at the Info log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logInfo: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logInfo

/**
 * Logs the specified message or cause at the Warning log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logWarning: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logWarning

/**
 * Logs the specified message or cause at the Error log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logError: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logError

/**
 * Logs the specified message or cause at the Fatal log level.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logFatal: (...message: ReadonlyArray<any>) => Effect<void, never, never> = effect.logFatal

/**
 * Adds a log span to your effects, which tracks and logs the duration of
 * operations or tasks. This is useful for performance monitoring and debugging
 * time-sensitive processes.
 *
 * @example
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.sleep("1 second")
 *   yield* Effect.log("The job is finished!")
 * }).pipe(Effect.withLogSpan("myspan"))
 *
 * // Effect.runFork(program)
 * // timestamp=... level=INFO fiber=#0 message="The job is finished!" myspan=1011ms
 *
 * @since 2.0.0
 * @category Logging
 */
export const withLogSpan: {
  (label: string): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, label: string): Effect<A, E, R>
} = effect.withLogSpan

/**
 * Augments log outputs by appending custom annotations to log entries generated
 * within an effect. This function provides a way to add more context and detail
 * to log messages, making them more informative and easier to trace.
 *
 * @example
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   yield* Effect.log("message1")
 *   yield* Effect.log("message2")
 * }).pipe(Effect.annotateLogs("key", "value")) // Annotation as key/value pair
 *
 * // Effect.runFork(program)
 * // timestamp=... level=INFO fiber=#0 message=message1 key=value
 * // timestamp=... level=INFO fiber=#0 message=message2 key=value
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
 * Applies log annotations with a limited scope, restricting their appearance to
 * specific sections of your effect computations. Use
 * `annotateLogsScoped` to add metadata to logs that only appear within a
 * defined `Scope`, making it easier to manage context-specific logging.
 *
 * @example
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
 *
 * @since 3.1.0
 * @category Logging
 */
export const annotateLogsScoped: {
  (key: string, value: unknown): Effect<void, never, Scope.Scope>
  (values: Record<string, unknown>): Effect<void, never, Scope.Scope>
} = fiberRuntime.annotateLogsScoped

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @since 2.0.0
 * @category Logging
 */
export const logAnnotations: Effect<HashMap.HashMap<string, unknown>> = effect.logAnnotations

/**
 * Decides wether child fibers will report or not unhandled errors via the logger
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
 * `orDie` is used when you encounter failures that you do not want to
 * handle or recover from. It removes the error type from the effect and ensures
 * that the effect terminates the fiber if an error occurs.
 *
 * @example
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
 * Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: Cannot divide by zero
 * //   ...stack trace...
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orDie: <A, E, R>(self: Effect<A, E, R>) => Effect<A, never, R> = core.orDie

/**
 * Transforms an effect's failure into a fiber termination with a custom error
 * message.
 *
 * `orDieWith` works similarly to {@link orDie}, but it allows you to
 * specify a mapping function to customize the error message before terminating
 * the fiber. This is useful when you want to provide more detailed or
 * user-friendly error messages for failures that you do not intend to handle.
 *
 * @example
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
 * Effect.runPromise(program).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: defect: Cannot divide by zero
 * //   ...stack trace...
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <A, R>(self: Effect<A, E, R>) => Effect<A, never, R>
  <A, E, R>(self: Effect<A, E, R>, f: (error: E) => unknown): Effect<A, never, R>
} = core.orDieWith

/**
 * Tries one effect, and if it fails, attempts another effect as a fallback.
 *
 * `orElse` allows you to attempt to run an effect, and if it fails, you
 * can provide a fallback effect to run instead. This is useful for handling
 * failures gracefully by defining an alternative effect to execute if the first
 * one encounters an error.
 *
 * @see {@link catchAll} if you need to access the error in the fallback effect.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElse: {
  <A2, E2, R2>(that: LazyArg<Effect<A2, E2, R2>>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, that: LazyArg<Effect<A2, E2, R2>>): Effect<A2 | A, E2, R2 | R>
} = core.orElse

/**
 * Replaces the original failure with a new failure value.
 *
 * `orElseFail` allows you to replace the failure from one effect with a
 * custom failure value. If the effect fails, you can provide a new failure to
 * be returned instead of the original one.
 *
 * **Important**: This function only applies to failed effects. If the effect
 * succeeds, it will remain unaffected.
 *
 * @see {@link mapError} if you need to access the error to transform it.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElseFail: {
  <E2>(evaluate: LazyArg<E2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E2, R>
  <A, E, R, E2>(self: Effect<A, E, R>, evaluate: LazyArg<E2>): Effect<A, E2, R>
} = effect.orElseFail

/**
 * Replaces the original failure with a success value, ensuring the effect
 * cannot fail.
 *
 * `orElseSucceed` allows you to replace the failure of an effect with a
 * success value. If the effect fails, it will instead succeed with the provided
 * value, ensuring the effect always completes successfully. This is useful when
 * you want to guarantee a successful result regardless of whether the original
 * effect failed.
 *
 * The function ensures that any failure is effectively "swallowed" and replaced
 * by a successful value, which can be helpful for providing default values in
 * case of failure.
 *
 * **Important**: This function only applies to failed effects. If the effect
 * already succeeds, it will remain unchanged.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElseSucceed: {
  <A2>(evaluate: LazyArg<A2>): <A, E, R>(self: Effect<A, E, R>) => Effect<A2 | A, never, R>
  <A, E, R, A2>(self: Effect<A, E, R>, evaluate: LazyArg<A2>): Effect<A | A2, never, R>
} = effect.orElseSucceed

/**
 * Runs a series of effects and returns the result of the first successful one.
 * If none of the effects succeed, it fails with the error from the last effect.
 *
 * `firstSuccessOf` allows you to try multiple effects in sequence, and
 * as soon as one of them succeeds, it returns that result. If all effects fail,
 * it returns the error of the last effect in the list. This is useful when you
 * have several potential alternatives and want to use the first one that works.
 *
 * This function is sequential, meaning that the `Effect` values in the iterable
 * will be executed in sequence, and the first one that succeeds will determine
 * the outcome of the resulting `Effect` value.
 *
 * **Important**: If the collection of effects provided to
 * `firstSuccessOf` is empty, it will throw an `IllegalArgumentException`
 * error.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Fallback
 */
export const firstSuccessOf: <Eff extends Effect<any, any, any>>(
  effects: Iterable<Eff>
) => Effect<Effect.Success<Eff>, Effect.Error<Eff>, Effect.Context<Eff>> = effect.firstSuccessOf

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
 * @category Creating Effects
 */
export const withRandomScoped: <A extends Random.Random>(value: A) => Effect<void, never, Scope.Scope> =
  fiberRuntime.withRandomScoped

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
  /** only if the given permits are available, run the effect and release the permits when finished */
  withPermitsIfAvailable(permits: number): <A, E, R>(self: Effect<A, E, R>) => Effect<Option.Option<A>, E, R>
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

/**
 * @category latch
 * @since 3.8.0
 */
export interface Latch extends Effect<void> {
  /** open the latch, releasing all fibers waiting on it */
  readonly open: Effect<void>
  /** release all fibers waiting on the latch, without opening it */
  readonly release: Effect<void>
  /** wait for the latch to be opened */
  readonly await: Effect<void>
  /** close the latch */
  readonly close: Effect<void>
  /** close the latch */
  readonly unsafeClose: () => void
  /** only run the given effect when the latch is open */
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
 * @category latch
 * @since 3.8.0
 */
export const unsafeMakeLatch: (open?: boolean | undefined) => Latch = circular.unsafeMakeLatch

/**
 * @category latch
 * @since 3.8.0
 * @example
 * import { Effect } from "effect"
 *
 * Effect.gen(function*() {
 *   // Create a latch, starting in the closed state
 *   const latch = yield* Effect.makeLatch(false)
 *
 *   // Fork a fiber that logs "open sesame" when the latch is opened
 *   const fiber = yield* Effect.log("open sesame").pipe(
 *     latch.whenOpen,
 *     Effect.fork
 *   )
 *
 *   // Open the latch
 *   yield* latch.open
 *   yield* fiber.await
 * })
 */
export const makeLatch: (open?: boolean | undefined) => Effect<Latch, never, never> = circular.makeLatch

/**
 * The foundational function for running effects, returning a "fiber" that can
 * be observed or interrupted.
 *
 * **When to Use**
 *
 * `runFork` is used to run an effect in the background by creating a
 * fiber. It is the base function for all other run functions. It starts a fiber
 * that can be observed or interrupted.
 *
 * Unless you specifically need a `Promise` or synchronous operation,
 * `runFork` is a good default choice.
 *
 * @example
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
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runFork: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunForkOptions
) => Fiber.RuntimeFiber<A, E> = _runtime.unsafeForkEffect

/**
 * @since 2.0.0
 * @category Running Effects
 */
export const runCallback: <A, E>(
  effect: Effect<A, E>,
  options?: Runtime.RunCallbackOptions<A, E> | undefined
) => Runtime.Cancel<A, E> = _runtime.unsafeRunEffect

/**
 * Executes an effect and returns the result as a `Promise`.
 *
 * **When to Use**
 *
 * Use `runPromise` when you need to execute an effect and work with the
 * result using `Promise` syntax, typically for compatibility with other
 * promise-based code.
 *
 * If the effect succeeds, the promise will resolve with the result. If the
 * effect fails, the promise will reject with an error.
 *
 * @see {@link runPromiseExit} for a version that returns an `Exit` type instead of rejecting.
 *
 * @example
 * // Title: Running a Successful Effect as a Promise
 * import { Effect } from "effect"
 *
 * Effect.runPromise(Effect.succeed(1)).then(console.log)
 * // Output: 1
 *
 * @example
 * //Example: Handling a Failing Effect as a Rejected Promise
 * import { Effect } from "effect"
 *
 * Effect.runPromise(Effect.fail("my error")).catch(console.error)
 * // Output:
 * // (FiberFailure) Error: my error
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runPromise: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<A> = _runtime.unsafeRunPromiseEffect

/**
 * Runs an effect and returns a `Promise` that resolves to an `Exit`, which
 * represents the outcome (success or failure) of the effect.
 *
 * **When to Use**
 *
 * Use `runPromiseExit` when you need to determine if an effect succeeded
 * or failed, including any defects, and you want to work with a `Promise`.
 *
 * **Details**
 *
 * The `Exit` type represents the result of the effect:
 * - If the effect succeeds, the result is wrapped in a `Success`.
 * - If it fails, the failure information is provided as a `Failure` containing
 *   a `Cause` type.
 *
 * @example
 * // Title: Handling Results as Exit
 * import { Effect } from "effect"
 *
 * // Execute a successful effect and get the Exit result as a Promise
 * Effect.runPromiseExit(Effect.succeed(1)).then(console.log)
 * // Output:
 * // {
 * //   _id: "Exit",
 * //   _tag: "Success",
 * //   value: 1
 * // }
 *
 * // Execute a failing effect and get the Exit result as a Promise
 * Effect.runPromiseExit(Effect.fail("my error")).then(console.log)
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
 *
 * @since 2.0.0
 * @category Running Effects
 */
export const runPromiseExit: <A, E>(
  effect: Effect<A, E, never>,
  options?: { readonly signal?: AbortSignal } | undefined
) => Promise<Exit.Exit<A, E>> = _runtime.unsafeRunPromiseExitEffect

/**
 * Executes an effect synchronously, running it immediately and returning the
 * result.
 *
 * **When to Use**
 *
 * Use `runSync` to run an effect that does not fail and does not include
 * any asynchronous operations.
 *
 * If the effect fails or involves asynchronous work, it will throw an error,
 * and execution will stop where the failure or async operation occurs.
 *
 * @see {@link runSyncExit} for a version that returns an `Exit` type instead of
 * throwing an error.
 *
 * @example
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
export const runSync: <A, E>(effect: Effect<A, E>) => A = _runtime.unsafeRunSyncEffect

/**
 * Runs an effect synchronously and returns the result as an `Exit` type, which
 * represents the outcome (success or failure) of the effect.
 *
 * **When to Use**
 *
 * Use `runSyncExit` to find out whether an effect succeeded or failed,
 * including any defects, without dealing with asynchronous operations.
 *
 * **Details**
 *
 * The `Exit` type represents the result of the effect:
 * - If the effect succeeds, the result is wrapped in a `Success`.
 * - If it fails, the failure information is provided as a `Failure` containing
 *   a `Cause` type.
 *
 * If the effect contains asynchronous operations, `runSyncExit` will
 * return an `Failure` with a `Die` cause, indicating that the effect cannot be
 * resolved synchronously.
 *
 * @example
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
export const runSyncExit: <A, E>(effect: Effect<A, E>) => Exit.Exit<A, E> = _runtime.unsafeRunSyncExitEffect

/**
 * The `validate` function allows you to combine multiple effects,
 * continuing the combination even if some of the effects fail. It accumulates
 * both successes and failures, allowing you to proceed through all effects
 * regardless of individual failures.
 *
 * This function is similar to {@link zip}, but with `validate`, errors
 * do not stop the execution of subsequent effects. Instead, errors are
 * accumulated in a `Cause` and reported in the final result. This is useful
 * when you want to collect all results, including failures, instead of stopping
 * at the first error.
 *
 * @see {@link zip} for a version that stops at the first error.
 *
 * @example
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
 * Effect.runPromiseExit(program).then(console.log)
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
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
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
 * Combines two effects into a single effect, producing a tuple with the results of both effects.
 *
 * The `zip` function executes the first effect (left) and then the second effect (right).
 * Once both effects succeed, their results are combined into a tuple.
 *
 * **Concurrency**
 *
 * By default, `zip` processes the effects sequentially. To execute the effects concurrently,
 * use the `{ concurrent: true }` option.
 *
 * @see {@link zipWith} for a version that combines the results with a custom function.
 * @see {@link validate} for a version that accumulates errors.
 *
 * @example
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
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // [ 1, 'hello' ]
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
 * Effect.runPromise(program).then(console.log)
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
 * Runs two effects sequentially, returning the result of the first effect and
 * discarding the result of the second.
 *
 * **When to Use**
 *
 * Use `zipLeft` when you need to execute two effects in order but are only
 * interested in the result of the first one. The second effect will still
 * execute, but its result is ignored.
 *
 * **Concurrency**
 *
 * By default, the effects are run sequentially. To run them concurrently, use
 * the `{ concurrent: true }` option.
 *
 * @see {@link zipRight} for a version that returns the result of the second effect.
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
 * const program = Effect.zipLeft(task1, task2)
 *
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // 1
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
 * Runs two effects sequentially, returning the result of the second effect
 * while discarding the result of the first.
 *
 * **When to Use**
 *
 * Use `zipRight` when you need to execute two effects in sequence and only care
 * about the result of the second effect. The first effect will still execute
 * but its result will be ignored.
 *
 * **Concurrency**
 *
 * By default, the effects are run sequentially. To execute them concurrently,
 * use the `{ concurrent: true }` option.
 *
 * @see {@link zipLeft} for a version that returns the result of the first effect.
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
 * const program = Effect.zipRight(task1, task2)
 *
 * Effect.runPromise(program).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#0 message="task1 done"
 * // timestamp=... level=INFO fiber=#0 message="task2 done"
 * // hello
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
 * **When to Use**
 *
 * The `zipWith` function is similar to {@link zip}, but instead of returning a
 * tuple of results, it applies a provided function to the results of the two
 * effects, combining them into a single value.
 *
 * **Concurrency**
 *
 * By default, the effects are run sequentially. To execute them concurrently,
 * use the `{ concurrent: true }` option.
 *
 * @example
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
 * Effect.runPromise(task3).then(console.log)
 * // Output:
 * // timestamp=... level=INFO fiber=#3 message="task1 done"
 * // timestamp=... level=INFO fiber=#2 message="task2 done"
 * // 6
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
 * @category Tracing
 */
export const withTracerTiming: {
  (enabled: boolean): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(effect: Effect<A, E, R>, enabled: boolean): Effect<A, E, R>
} = core.withTracerTiming

/**
 * Adds an annotation to each span in this effect.
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
 * Adds an annotation to the current span if available
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
 * Creates an effect that fails with a `NoSuchElementException` if the input
 * value is `null` or `undefined`. If the value is non-null, the effect succeeds
 * with the value.
 *
 * **When to Use**
 *
 * Use `fromNullable` to safely handle potentially nullable values and ensure
 * that the effect either fails with a clear error or succeeds with the valid
 * value.
 *
 * @example
 * import { Effect } from "effect"
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe1 = Effect.fromNullable(1)
 *
 * Effect.runPromiseExit(maybe1).then(console.log)
 * // Output:
 * // { _id: 'Exit', _tag: 'Success', value: 1 }
 *
 * //      ┌─── Effect<number, NoSuchElementException, never>
 * //      ▼
 * const maybe2 = Effect.fromNullable(null as number | null)
 *
 * Effect.runPromiseExit(maybe2).then(console.log)
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
 * If the original effect succeeds, its value is wrapped in `Option.some`. If
 * the effect fails with `Cause.NoSuchElementException`, the failure is mapped
 * to `Option.none` in the success channel. Other types of failures are left
 * unchanged.
 *
 * @example
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
 * Effect.runPromise(option1).then(console.log)
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
 * Effect.runPromise(option2).then(console.log)
 * // Output: { _tag: 'None' }
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
 * @example
 * import { Effect, Layer } from "effect"
 *
 * class MapTag extends Effect.Tag("MapTag")<MapTag, Map<string, string>>() {
 *  static Live = Layer.effect(
 *    this,
 *    Effect.sync(() => new Map())
 *  )
 * }
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
 * @example
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
