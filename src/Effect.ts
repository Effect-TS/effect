/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Clock from "./Clock.js"
import type { ConfigProvider } from "./ConfigProvider.js"
import type { Console } from "./Console.js"
import type * as Context from "./Context.js"
import type * as Deferred from "./Deferred.js"
import type * as Duration from "./Duration.js"
import type * as Either from "./Either.js"
import type * as Equal from "./Equal.js"
import type { Equivalence } from "./Equivalence.js"
import type { ExecutionStrategy } from "./ExecutionStrategy.js"
import type * as Exit from "./Exit.js"
import type * as Fiber from "./Fiber.js"
import type * as FiberId from "./FiberId.js"
import type * as FiberRef from "./FiberRef.js"
import type * as FiberRefs from "./FiberRefs.js"
import type * as FiberRefsPatch from "./FiberRefsPatch.js"
import type { LazyArg } from "./Function.js"
import { dual, identity } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import type * as HashSet from "./HashSet.js"
import type { TypeLambda } from "./HKT.js"
import * as _console from "./internal/console.js"
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
import type * as Request from "./Request.js"
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
import type { Concurrency, Covariant, NoInfer } from "./Types.js"
import type * as Unify from "./Unify.js"

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 */
export type MergeRecord<K, H> = {
  [k in keyof K | keyof H]: k extends keyof K ? K[k]
    : k extends keyof H ? H[k]
    : never
} extends infer X ? X
  : never

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
export interface Effect<out R, out E, out A> extends Effect.Variance<R, E, A>, Equal.Equal, Pipeable {
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: EffectUnify<this>
  readonly [Unify.ignoreSymbol]?: EffectUnifyIgnore
}

/**
 * @since 2.0.0
 * @category models
 */
export interface EffectUnify<A extends { [Unify.typeSymbol]?: any }>
  extends Either.EitherUnify<A>, Option.OptionUnify<A>, Context.TagUnify<A>
{
  Effect?: () => A[Unify.typeSymbol] extends Effect<infer R0, infer E0, infer A0> | infer _ ? Effect<R0, E0, A0> : never
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
  readonly type: Effect<this["Out2"], this["Out1"], this["Target"]>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Blocked<out E, out A> extends Effect<never, E, A> {
  readonly _op: "Blocked"
  readonly i0: RequestBlock
  readonly i1: Effect<never, E, A>
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Context.js" {
  interface Tag<Identifier, Service> extends Effect<Identifier, never, Service> {}
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
  interface Left<E, A> extends Effect<never, E, A> {
    readonly _tag: "Left"
  }
  interface Right<E, A> extends Effect<never, E, A> {
    readonly _tag: "Right"
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
  interface None<A> extends Effect<never, Cause.NoSuchElementException, A> {
    readonly _tag: "None"
  }
  interface Some<A> extends Effect<never, Cause.NoSuchElementException, A> {
    readonly _tag: "Some"
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
  export interface Variance<out R, out E, out A> {
    readonly [EffectTypeId]: VarianceStruct<R, E, A>
  }
  /**
   * @since 2.0.0
   * @category models
   */
  export interface VarianceStruct<out R, out E, out A> {
    readonly _V: string
    readonly _R: Covariant<R>
    readonly _E: Covariant<E>
    readonly _A: Covariant<A>
  }
  /**
   * @since 2.0.0
   * @category models
   */
  export type Unify<Ret extends Effect<any, any, any>> = Effect<
    Context<Ret>,
    Error<Ret>,
    Success<Ret>
  >
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Context<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _R : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _E : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _A : never
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
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedWithTTL: {
  (timeToLive: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Effect<never, E, A>>
  <R, E, A>(self: Effect<R, E, A>, timeToLive: Duration.DurationInput): Effect<R, never, Effect<never, E, A>>
} = circular.cached

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedInvalidateWithTTL: {
  (timeToLive: Duration.DurationInput): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, never, [Effect<never, E, A>, Effect<never, never, void>]>
  <R, E, A>(
    self: Effect<R, E, A>,
    timeToLive: Duration.DurationInput
  ): Effect<R, never, [Effect<never, E, A>, Effect<never, never, void>]>
} = circular.cachedInvalidate

/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @since 2.0.0
 * @category caching
 */
export const cached: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, A>> = effect.memoize

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @since 2.0.0
 * @category caching
 */
export const cachedFunction: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  eq?: Equivalence<A>
) => Effect<never, never, (a: A) => Effect<R, E, B>> = circular.memoizeFunction

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @example
 * import * as Effect from "effect/Effect"
 * import * as Console from "effect/Console"
 *
 * const program = Effect.gen(function* (_) {
 *   const twice = Console.log("twice")
 *   yield* _(twice, Effect.repeatN(1))
 *   const once = yield* _(Console.log("once"), Effect.once)
 *   yield* _(once, Effect.repeatN(1))
 * })
 *
 * Effect.runFork(program)
 * // Output:
 * // twice
 * // twice
 * // once
 *
 * @since 2.0.0
 * @category caching
 */
export const once: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, void>> = effect.once

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
    [Iterable<Effect.Variance<infer R, infer E, infer A>>] ? Effect<
      R,
      Mode extends "either" ? never
        : Mode extends "validate" ? Array<Option.Option<E>>
        : E,
      Discard extends true ? void : Mode extends "either" ? Array<Either.Either<E, A>> : Array<A>
    >
    : never

  /**
   * @since 2.0.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean, Mode> = Effect<
    T[number] extends never ? never
      : [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    Mode extends "either" ? never
      : T[number] extends never ? never
      : Mode extends "validate" ? {
          -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? Option.Option<_E>
            : never
        }
      : [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    Discard extends true ? void
      : T[number] extends never ? []
      : Mode extends "either" ? {
          -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ?
            Either.Either<_E, _A>
            : never
        }
      : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? _A : never }
  > extends infer X ? X : never

  /**
   * @since 2.0.0
   */
  export type ReturnObject<T, Discard extends boolean, Mode> = [T] extends [{ [K: string]: EffectAny }] ? Effect<
      keyof T extends never ? never
        : [T[keyof T]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R
        : never,
      Mode extends "either" ? never
        : keyof T extends never ? never
        : Mode extends "validate" ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? Option.Option<_E>
              : never
          }
        : [T[keyof T]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E
        : never,
      Discard extends true ? void
        : Mode extends "either" ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ?
              Either.Either<_E, _A>
              : never
          }
        : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? _A : never }
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
export const allSuccesses: <R, E, A>(
  elements: Iterable<Effect<R, E, A>>,
  options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }
) => Effect<R, never, Array<A>> = fiberRuntime.allSuccesses

/**
 * Drops all elements until the effectful predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const dropUntil: {
  <B extends A, R, E, A = B>(
    predicate: (a: A, i: number) => Effect<R, E, boolean>
  ): (elements: Iterable<B>) => Effect<R, E, Array<B>>
  <A, R, E>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Array<A>>
} = effect.dropUntil

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const dropWhile: {
  <B extends A, R, E, A = B>(
    predicate: (a: A, i: number) => Effect<R, E, boolean>
  ): (elements: Iterable<B>) => Effect<R, E, Array<B>>
  <A, R, E>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Array<A>>
} = effect.dropWhile

/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const every: {
  <R, E, A>(f: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, boolean>
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, boolean>
} = effect.every

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const exists: {
  <R, E, A>(
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): (elements: Iterable<A>) => Effect<R, E, boolean>
  <R, E, A>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R, E, boolean>
} = fiberRuntime.exists

/**
 * Filters the collection using the specified effectful predicate.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const filter: {
  <A, R, E>(
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
    }
  ): (elements: Iterable<A>) => Effect<R, E, Array<A>>
  <A, R, E>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly negate?: boolean | undefined
    }
  ): Effect<R, E, Array<A>>
} = fiberRuntime.filter

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const findFirst: {
  <A, R, E>(f: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, Option.Option<A>>
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Option.Option<A>>
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
export const firstSuccessOf: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = effect.firstSuccessOf

/**
 * @since 2.0.0
 * @category collecting & elements
 */
export const forEach: {
  <A, R, E, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): (self: Iterable<A>) => Effect<R, E, Array<B>>
  <A, R, E, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): (self: Iterable<A>) => Effect<R, E, void>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect<R, E, Array<B>>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<R, E, void>
} = fiberRuntime.forEach

/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const head: <R, E, A>(self: Effect<R, E, Iterable<A>>) => Effect<R, E | Cause.NoSuchElementException, A> =
  effect.head

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single effect, working
 * sequentially.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const mergeAll: {
  <Z, A>(
    zero: Z,
    f: (z: Z, a: A, i: number) => Z,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Z>
  <R, E, A, Z>(
    elements: Iterable<Effect<R, E, A>>,
    zero: Z,
    f: (z: Z, a: A, i: number) => Z,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R, E, Z>
} = fiberRuntime.mergeAll

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const partition: {
  <R, E, A, B>(
    f: (a: A) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): (elements: Iterable<A>) => Effect<R, never, [excluded: Array<E>, satisfying: Array<B>]>
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | "inherit" | undefined
  }): Effect<R, never, [excluded: Array<E>, satisfying: Array<B>]>
} = fiberRuntime.partition

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduce: {
  <Z, A, R, E>(zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, Z>): (elements: Iterable<A>) => Effect<R, E, Z>
  <Z, A, R, E>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, Z>): Effect<R, E, Z>
} = effect.reduce

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single effect.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceEffect: {
  <R, E, A>(
    zero: Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): (elements: Iterable<Effect<R, E, A>>) => Effect<R, E, A>
  <R, E, A>(
    elements: Iterable<Effect<R, E, A>>,
    zero: Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R, E, A>
} = fiberRuntime.reduceEffect

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceRight: {
  <A, Z, R, E>(zero: Z, f: (a: A, z: Z, i: number) => Effect<R, E, Z>): (elements: Iterable<A>) => Effect<R, E, Z>
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z, i: number) => Effect<R, E, Z>): Effect<R, E, Z>
} = effect.reduceRight

/**
 * Folds over the elements in this chunk from the left, stopping the fold early
 * when the predicate is not satisfied.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const reduceWhile: {
  <A, R, E, Z>(
    zero: Z,
    options: {
      readonly while: Predicate<Z>
      readonly body: (s: Z, a: A, i: number) => Effect<R, E, Z>
    }
  ): (elements: Iterable<A>) => Effect<R, E, Z>
  <A, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    options: {
      readonly while: Predicate<Z>
      readonly body: (s: Z, a: A, i: number) => Effect<R, E, Z>
    }
  ): Effect<R, E, Z>
} = effect.reduceWhile

/**
 * Replicates the given effect `n` times.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const replicate: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Array<Effect<R, E, A>>
  <R, E, A>(self: Effect<R, E, A>, n: number): Array<Effect<R, E, A>>
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
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Array<A>>
  (
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void>
  <R, E, A>(
    self: Effect<R, E, A>,
    n: number,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect<R, E, Array<A>>
  <R, E, A>(
    self: Effect<R, E, A>,
    n: number,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<R, E, void>
} = fiberRuntime.replicateEffect

/**
 * Takes elements until the effectual predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const takeUntil: {
  <B extends A, R, E, A = B>(
    predicate: (a: A, i: number) => Effect<R, E, boolean>
  ): (elements: Iterable<B>) => Effect<R, E, Array<B>>
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Array<A>>
} = effect.takeUntil

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @since 2.0.0
 * @category collecting & elements
 */
export const takeWhile: {
  <R, E, B extends A, A = B>(
    predicate: (a: A, i: number) => Effect<R, E, boolean>
  ): (elements: Iterable<B>) => Effect<R, E, Array<B>>
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Array<A>>
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
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): (elements: Iterable<A>) => Effect<R, Array<E>, Array<B>>
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): (elements: Iterable<A>) => Effect<R, Array<E>, void>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard?: false | undefined
    }
  ): Effect<R, Array<E>, Array<B>>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
      readonly discard: true
    }
  ): Effect<R, Array<E>, void>
} = fiberRuntime.validateAll

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * If `elements` is empty then `Effect.fail([])` is returned.
 *
 * @example
 * import * as Effect from "effect/Effect"
 * import * as Exit from "effect/Exit"
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
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): (elements: Iterable<A>) => Effect<R, Array<E>, B>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R, Array<E>, B>
} = fiberRuntime.validateFirst

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * Imports an asynchronous side-effect into a pure `Effect` value.
 * The callback function `Effect<R, E, A> => void` must be called at most once.
 *
 * If an Effect is returned by the registration function, it will be executed
 * if the fiber executing the effect is interrupted.
 *
 * The registration function can also receive an `AbortSignal` if required for
 * interruption.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @since 2.0.0
 * @category constructors
 */
export const async: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void, signal: AbortSignal) => void | Effect<R, never, void>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = core.async

/**
 * Converts an asynchronous, callback-style API into an `Effect`, which will
 * be executed asynchronously.
 *
 * With this variant, the registration function may return a an `Effect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncEffect: <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect<R, E, A>) => void) => Effect<R2, E2, X>
) => Effect<R | R2, E | E2, A> = _runtime.asyncEffect

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncOption: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Option.Option<Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = effect.asyncOption

/**
 * Imports an asynchronous side-effect into an effect. It has the option of
 * returning the value synchronously, which is useful in cases where it cannot
 * be determined if the effect is synchronous or asynchronous until the register
 * is actually executed. It also has the option of returning a canceler,
 * which will be used by the runtime to cancel the asynchronous effect if the fiber
 * executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asyncEither: <R, E, A>(
  register: (callback: (effect: Effect<R, E, A>) => void) => Either.Either<Effect<R, never, void>, Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = core.asyncEither

/**
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Effect<never, E, never> = core.fail

/**
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Effect<never, E, never> = core.failSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E, never> = core.failCause

/**
 * @since 2.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Effect<never, E, never> = core.failCauseSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Effect<never, never, never> = core.die

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Effect<never, never, never> = core.dieMessage

/**
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Effect<never, never, never> = core.dieSync

/**
 * @since 2.0.0
 * @category constructors
 */
export const gen: {
  <Eff extends EffectGen<any, any, any>, AEff>(
    f: (resume: Adapter) => Generator<Eff, AEff, any>
  ): Effect<
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<infer R, any, any>] ? R : never,
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<any, infer E, any>] ? E : never,
    AEff
  >
  <Self, Eff extends EffectGen<any, any, any>, AEff>(
    self: Self,
    f: (this: Self, resume: Adapter) => Generator<Eff, AEff, any>
  ): Effect<
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<infer R, any, any>] ? R : never,
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<any, infer E, any>] ? E : never,
    AEff
  >
} = effect.gen

/**
 * @category models
 * @since 2.0.0
 */
export interface EffectGen<out R, out E, out A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A
  readonly value: Effect<R, E, A>

  [Symbol.iterator](): Generator<EffectGen<R, E, A>, A>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Adapter {
  <R, E, A>(self: Effect<R, E, A>): EffectGen<R, E, A>
  <A, _R, _E, _A>(a: A, ab: (a: A) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, C, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, C, D, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, _R, _E, _A>(
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
    jk: (j: J) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, _R, _E, _A>(
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
    kl: (k: K) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, _R, _E, _A>(
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
    lm: (l: L) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _R, _E, _A>(
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
    mn: (m: M) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _R, _E, _A>(
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
    no: (n: N) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _R, _E, _A>(
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
    op: (o: O) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _R, _E, _A>(
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
    pq: (p: P) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _R, _E, _A>(
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
    qr: (q: Q) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _R, _E, _A>(
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
    rs: (r: R) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _R, _E, _A>(
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
    st: (s: S) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _R, _E, _A>(
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
    tu: (s: T) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
}

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: Effect<never, never, never> = core.never

/**
 * Requires the option produced by this value to be `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const none: <R, E, A>(
  self: Effect<R, E, Option.Option<A>>
) => Effect<R, E | Cause.NoSuchElementException, void> = effect.none

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
  evaluate: (signal: AbortSignal) => Promise<A>
) => Effect<never, never, A> = effect.promise

/**
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Effect<never, never, A> = core.succeed

/**
 * Returns an effect which succeeds with `None`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedNone: Effect<never, never, Option.Option<never>> = effect.succeedNone

/**
 * Returns an effect which succeeds with the value wrapped in a `Some`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => Effect<never, never, Option.Option<A>> = effect.succeedSome

/**
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(effect: LazyArg<Effect<R, E, A>>) => Effect<R, E, A> = core.suspend

/**
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Effect<never, never, A> = core.sync

/**
 * @since 2.0.0
 * @category constructors
 */
export const unit: Effect<never, never, void> = core.unit

/**
 * @since 2.0.0
 * @category constructors
 */
export const yieldNow: (options?: {
  readonly priority?: number | undefined
}) => Effect<never, never, void> = core.yieldNow

// -------------------------------------------------------------------------------------
// error handling
// -------------------------------------------------------------------------------------

const _catch: {
  <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(discriminator: N, options: {
    readonly failure: K
    readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>
  }): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { [n in N]: K }>, A1 | A>
  <R, E, A, N extends keyof E, K extends E[N] & string, R1, E1, A1>(
    self: Effect<R, E, A>,
    discriminator: N,
    options: {
      readonly failure: K
      readonly onFailure: (error: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>
    }
  ): Effect<R | R1, E1 | Exclude<E, { [n in N]: K }>, A | A1>
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
  <E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Effect<R, E, A>, f: (e: E) => Effect<R2, E2, A2>): Effect<R | R2, E2, A | A2>
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
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
  ): Effect<R | R2, E2, A | A2>
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
  <R2, E2, A2>(
    f: (defect: unknown) => Effect<R2, E2, A2>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    f: (defect: unknown) => Effect<R2, E2, A2>
  ): Effect<R | R2, E | E2, A | A2>
} = effect.catchAllDefect

/**
 * Recovers from errors that match the given predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchIf: {
  <E, EA extends E, EB extends EA, R2, E2, A2>(
    refinement: Refinement<EA, EB>,
    f: (e: EB) => Effect<R2, E2, A2>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | Exclude<E, EB>, A2 | A>
  <E, EX extends E, R2, E2, A2>(
    predicate: Predicate<EX>,
    f: (e: EX) => Effect<R2, E2, A2>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A>
  <R, E, A, EA extends E, EB extends EA, R2, E2, A2>(
    self: Effect<R, E, A>,
    refinement: Refinement<EA, EB>,
    f: (e: EB) => Effect<R2, E2, A2>
  ): Effect<R | R2, E2 | Exclude<E, EB>, A | A2>
  <R, E, A, EX extends E, R2, E2, A2>(
    self: Effect<R, E, A>,
    predicate: Predicate<EX>,
    f: (e: EX) => Effect<R2, E2, A2>
  ): Effect<R | R2, E | E2, A | A2>
} = core.catchIf

/**
 * Recovers from some or all of the error cases.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, R2, E2, A2>(
    pf: (e: E) => Option.Option<Effect<R2, E2, A2>>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Effect<R, E, A>,
    pf: (e: E) => Option.Option<Effect<R2, E2, A2>>
  ): Effect<R | R2, E | E2, A | A2>
} = core.catchSome

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSomeCause: {
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Option.Option<Effect<R2, E2, A2>>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Option.Option<Effect<R2, E2, A2>>
  ): Effect<R | R2, E | E2, A | A2>
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
  <R2, E2, A2>(
    pf: (defect: unknown) => Option.Option<Effect<R2, E2, A2>>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    pf: (defect: unknown) => Option.Option<Effect<R2, E2, A2>>
  ): Effect<R | R2, E | E2, A | A2>
} = effect.catchSomeDefect

/**
 * Recovers from the specified tagged error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): Effect<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
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
  ): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer R, any, any> ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer A> ? A : never
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
    self: Effect<R, E, A>,
    cases: Cases
  ): Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer R, any, any> ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer A> ? A : never
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
export const cause: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Cause.Cause<E>> = effect.cause

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @since 2.0.0
 * @category error handling
 */
export const eventually: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A> = effect.eventually

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const ignore: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void> = effect.ignore

/**
 * Returns a new effect that ignores the success or failure of this effect,
 * but which also logs failures at the Debug level, just in case the failure
 * turns out to be important.
 *
 * @since 2.0.0
 * @category error handling
 */
export const ignoreLogged: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void> = effect.ignoreLogged

/**
 * Exposes all parallel errors in a single call.
 *
 * @since 2.0.0
 * @category error handling
 */
export const parallelErrors: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Array<E>, A> = effect.parallelErrors

/**
 * Exposes the full `Cause` of failure for the specified effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const sandbox: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Cause.Cause<E>, A> = effect.sandbox

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @since 2.0.0
 * @category error handling
 */
export const retry: {
  <R1, E extends E0, E0, B>(policy: Schedule.Schedule<R1, E0, B>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>
  <R, E extends E0, E0, A, R1, B>(self: Effect<R, E, A>, policy: Schedule.Schedule<R1, E0, B>): Effect<R | R1, E, A>
} = _schedule.retry_Effect

/**
 * Retries this effect the specified number of times.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryN: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A>
} = _schedule.retryN_Effect

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryOrElse: {
  <R1, E extends E3, A1, R2, E2, A2, E3>(
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, A2 | A>
  <R, E extends E3, A, R1, A1, R2, E2, A2, E3>(
    self: Effect<R, E, A>,
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>
  ): Effect<R | R1 | R2, E | E2, A | A2>
} = _schedule.retryOrElse_Effect

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryUntil: {
  <E, E2 extends E>(f: Refinement<E, E2>): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <E>(f: Predicate<E>): <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, E2 extends E>(self: Effect<R, E, A>, f: Refinement<E, E2>): Effect<R, E2, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<E>): Effect<R, E, A>
} = _schedule.retryUntil_Effect

/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryUntilEffect: {
  <R1, E, E2>(f: (e: E) => Effect<R1, E2, boolean>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E | E2, A>
  <R, E, A, R1, E2>(self: Effect<R, E, A>, f: (e: E) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
} = _schedule.retryUntilEffect_Effect

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryWhile: {
  <E>(f: Predicate<E>): <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<E>): Effect<R, E, A>
} = _schedule.retryWhile_Effect

/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retryWhileEffect: {
  <R1, E, E2>(f: (e: E) => Effect<R1, E2, boolean>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E | E2, A>
  <R, E, A, R1, E2>(self: Effect<R, E, A>, f: (e: E) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
} = _schedule.retryWhileEffect_Effect

const try_: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Effect<never, E, A>
  <A>(evaluate: LazyArg<A>): Effect<never, Cause.UnknownException, A>
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
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B>
  <R, E, A, B, E1>(
    self: Effect<R, E, A>,
    options: { readonly try: (a: A) => B; readonly catch: (error: unknown) => E1 }
  ): Effect<R, E | E1, B>
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
    options: {
      readonly try: (a: A, signal: AbortSignal) => Promise<B>
      readonly catch: (error: unknown) => E1
    }
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B>
  <R, E, A, B, E1>(
    self: Effect<R, E, A>,
    options: {
      readonly try: (a: A, signal: AbortSignal) => Promise<B>
      readonly catch: (error: unknown) => E1
    }
  ): Effect<R, E | E1, B>
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
    options: { readonly try: (signal: AbortSignal) => Promise<A>; readonly catch: (error: unknown) => E }
  ): Effect<never, E, A>
  <A>(try_: (signal: AbortSignal) => Promise<A>): Effect<never, Cause.UnknownException, A>
} = effect.tryPromise

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect<R, E, A>`
 *
 * @since 2.0.0
 * @category error handling
 */
export const unsandbox: <R, E, A>(self: Effect<R, Cause.Cause<E>, A>) => Effect<R, E, A> = effect.unsandbox

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
export const allowInterrupt: Effect<never, never, void> = effect.allowInterrupt

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @since 2.0.0
 * @category interruption
 */
export const checkInterruptible: <R, E, A>(f: (isInterruptible: boolean) => Effect<R, E, A>) => Effect<R, E, A> =
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
export const disconnect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = fiberRuntime.disconnect

/**
 * @since 2.0.0
 * @category interruption
 */
export const interrupt: Effect<never, never, never> = core.interrupt

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptWith: (fiberId: FiberId.FiberId) => Effect<never, never, never> = core.interruptWith

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.interruptible

/**
 * @since 2.0.0
 * @category interruption
 */
export const interruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A> = core.interruptibleMask

/**
 * @since 2.0.0
 * @category interruption
 */
export const onInterrupt: {
  <R2, X>(
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(
    self: Effect<R, E, A>,
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
} = core.onInterrupt

/**
 * @since 2.0.0
 * @category interruption
 */
export const uninterruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.uninterruptible

/**
 * @since 2.0.0
 * @category interruption
 */
export const uninterruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A> = core.uninterruptibleMask

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
  <B>(value: B): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, B>
  <R, E, A, B>(self: Effect<R, E, A>, value: B): Effect<R, E, B>
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
export const asSome: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>> = effect.asSome

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
export const asSomeError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Option.Option<E>, A> = effect.asSomeError

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
export const asUnit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void> = core.asUnit

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @since 2.0.0
 * @category mapping
 */
export const flip: <R, E, A>(self: Effect<R, E, A>) => Effect<R, A, E> = core.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @since 2.0.0
 * @category mapping
 */
export const flipWith: {
  <R, A, E, R2, A2, E2>(
    f: (effect: Effect<R, A, E>) => Effect<R2, A2, E2>
  ): (self: Effect<R, E, A>) => Effect<R2, E2, A2>
  <R, A, E, R2, A2, E2>(
    self: Effect<R, E, A>,
    f: (effect: Effect<R, A, E>) => Effect<R2, A2, E2>
  ): Effect<R2, E2, A2>
} = effect.flipWith

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <R, E, A, B>(self: Effect<R, E, A>, f: (a: A) => B): Effect<R, E, B>
} = core.map

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAccum: {
  <A, B, R, E, Z>(
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect<R, E, readonly [Z, B]>
  ): (elements: Iterable<A>) => Effect<R, E, [Z, Array<B>]>
  <A, B, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    f: (z: Z, a: A, i: number) => Effect<R, E, readonly [Z, B]>
  ): Effect<R, E, [Z, Array<B>]>
} = effect.mapAccum

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified `onFailure` and `onSuccess` functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <E, A, E2, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): <R>(self: Effect<R, E, A>) => Effect<R, E2, A2>
  <R, E, A, E2, A2>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Effect<R, E2, A2>
} = core.mapBoth

/**
 * Returns an effect with its error channel mapped using the specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, A, E, E2>(self: Effect<R, E, A>, f: (e: E) => E2): Effect<R, E2, A>
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
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, E, A, E2>(self: Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<R, E2, A>
} = effect.mapErrorCause

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @since 2.0.0
 * @category mapping
 */
export const merge: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, E | A> = effect.merge

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @since 2.0.0
 * @category mapping
 */
export const negate: <R, E>(self: Effect<R, E, boolean>) => Effect<R, E, boolean> = effect.negate

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
  <A, R2, X>(
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): <R, E>(acquire: Effect<R, E, A>) => Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect<R, E, A>,
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): Effect<Scope.Scope | R | R2, E, A>
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
  <A, R2, X>(
    release: (exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): <R, E>(acquire: Effect<R, E, A>) => Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect<R, E, A>,
    release: (exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): Effect<Scope.Scope | R | R2, E, A>
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
  <A, R2, E2, A2, R3, X>(
    use: (a: A) => Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect<R3, never, X>
  ): <R, E>(acquire: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2, R3, X>(
    acquire: Effect<R, E, A>,
    use: (a: A) => Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect<R3, never, X>
  ): Effect<R | R2 | R3, E | E2, A2>
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
export const addFinalizer: <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect<R, never, X>
) => Effect<R | Scope.Scope, never, void> = fiberRuntime.addFinalizer

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
  <R1, X>(finalizer: Effect<R1, never, X>): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>
  <R, E, A, R1, X>(self: Effect<R, E, A>, finalizer: Effect<R1, never, X>): Effect<R | R1, E, A>
} = fiberRuntime.ensuring

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const onError: {
  <E, R2, X>(
    cleanup: (cause: Cause.Cause<E>) => Effect<R2, never, X>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>
  <R, A, E, R2, X>(
    self: Effect<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
} = core.onError

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const onExit: {
  <E, A, R2, X>(
    cleanup: (exit: Exit.Exit<E, A>) => Effect<R2, never, X>
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(
    self: Effect<R, E, A>,
    cleanup: (exit: Exit.Exit<E, A>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
} = core.onExit

/**
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const parallelFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = fiberRuntime.parallelFinalizers

/**
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const finalizersMask: (strategy: ExecutionStrategy) => <R, E, A>(
  self: (restore: <R1, E1, A1>(self: Effect<R1, E1, A1>) => Effect<R1, E1, A1>) => Effect<R, E, A>
) => Effect<R, E, A> = fiberRuntime.finalizersMask

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
export const sequentialFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
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
export const scopeWith: <R, E, A>(f: (scope: Scope.Scope) => Effect<R, E, A>) => Effect<R | Scope.Scope, E, A> =
  fiberRuntime.scopeWith

/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const scoped: <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope.Scope>, E, A> =
  fiberRuntime.scopedEffect

/**
 * Scopes all resources acquired by `resource` to the lifetime of `use`
 * without effecting the scope of any resources acquired by `use`.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const using: {
  <A, R2, E2, A2>(
    use: (a: A) => Effect<R2, E2, A2>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | Exclude<R, Scope.Scope>, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    use: (a: A) => Effect<R2, E2, A2>
  ): Effect<R2 | Exclude<R, Scope.Scope>, E | E2, A2>
} = fiberRuntime.using

/**
 * Returns a new scoped workflow that returns the result of this workflow as
 * well as a finalizer that can be run to close the scope of this workflow.
 *
 * @since 2.0.0
 * @category scoping, resources & finalization
 */
export const withEarlyRelease: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<Scope.Scope | R, E, [Effect<never, never, void>, A]> = fiberRuntime.withEarlyRelease

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
export const awaitAllChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = circular.awaitAllChildren

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const daemonChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = fiberRuntime.daemonChildren

/**
 * Constructs an effect with information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const descriptor: Effect<never, never, Fiber.Fiber.Descriptor> = effect.descriptor

/**
 * Constructs an effect based on information about the current `Fiber`.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const descriptorWith: <R, E, A>(f: (descriptor: Fiber.Fiber.Descriptor) => Effect<R, E, A>) => Effect<R, E, A> =
  effect.descriptorWith

/**
 * Returns a new workflow that executes this one and captures the changes in
 * `FiberRef` values.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const diffFiberRefs: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, E, [FiberRefsPatch.FiberRefsPatch, A]> = effect.diffFiberRefs

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const ensuringChild: {
  <R2, X>(
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect<R2, never, X>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(
    self: Effect<R, E, A>,
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
} = circular.ensuringChild

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const ensuringChildren: {
  <R1, X>(
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<R1, never, X>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>
  <R, E, A, R1, X>(
    self: Effect<R, E, A>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<R1, never, X>
  ): Effect<R | R1, E, A>
} = circular.ensuringChildren

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fiberId: Effect<never, never, FiberId.FiberId> = core.fiberId

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fiberIdWith: <R, E, A>(f: (descriptor: FiberId.Runtime) => Effect<R, E, A>) => Effect<R, E, A> =
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
export const fork: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> = fiberRuntime.fork

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkDaemon: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> =
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
    options?: {
      readonly discard?: false | undefined
    }
  ): <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, never, Fiber.Fiber<E, Array<A>>>
  (options: {
    readonly discard: true
  }): <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, never, void>
  <R, E, A>(
    effects: Iterable<Effect<R, E, A>>,
    options?: {
      readonly discard?: false | undefined
    }
  ): Effect<R, never, Fiber.Fiber<E, Array<A>>>
  <R, E, A>(effects: Iterable<Effect<R, E, A>>, options: {
    readonly discard: true
  }): Effect<R, never, void>
} = circular.forkAll

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkIn: {
  (scope: Scope.Scope): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
  <R, E, A>(self: Effect<R, E, A>, scope: Scope.Scope): Effect<R, never, Fiber.RuntimeFiber<E, A>>
} = circular.forkIn

/**
 * Forks the fiber in a `Scope`, interrupting it when the scope is closed.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkScoped: <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | R, never, Fiber.RuntimeFiber<E, A>> =
  circular.forkScoped

/**
 * Like fork but handles an error with the provided handler.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const forkWithErrorHandler: {
  <E, X>(
    handler: (e: E) => Effect<never, never, X>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
  <R, E, A, X>(
    self: Effect<R, E, A>,
    handler: (e: E) => Effect<never, never, X>
  ): Effect<R, never, Fiber.RuntimeFiber<E, A>>
} = fiberRuntime.forkWithErrorHandler

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fromFiber: <E, A>(fiber: Fiber.Fiber<E, A>) => Effect<never, E, A> = circular.fromFiber

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const fromFiberEffect: <R, E, A>(fiber: Effect<R, E, Fiber.Fiber<E, A>>) => Effect<R, E, A> =
  circular.fromFiberEffect

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @since 2.0.0
 * @category supervision & fibers
 */
export const supervised: {
  <X>(supervisor: Supervisor.Supervisor<X>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, X>(self: Effect<R, E, A>, supervisor: Supervisor.Supervisor<X>): Effect<R, E, A>
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
export const transplant: <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect<R2, E2, A2>) => Effect<R2, E2, A2>) => Effect<R, E, A>
) => Effect<R, E, A> = core.transplant

/**
 * @since 2.0.0
 * @category supervision & fibers
 */
export const withConcurrency: {
  (concurrency: number | "unbounded"): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, concurrency: number | "unbounded"): Effect<R, E, A>
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
  (scheduler: Scheduler.Scheduler): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, scheduler: Scheduler.Scheduler): Effect<R, E, B>
} = Scheduler.withScheduler

/**
 * Sets the scheduling priority used when yielding
 *
 * @since 2.0.0
 * @category utils
 */
export const withSchedulingPriority: {
  (priority: number): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, priority: number): Effect<R, E, B>
} = core.withSchedulingPriority

/**
 * Sets the maximum number of operations before yield by the default schedulers
 *
 * @since 2.0.0
 * @category utils
 */
export const withMaxOpsBeforeYield: {
  (priority: number): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, priority: number): Effect<R, E, B>
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
export const clock: Effect<never, never, Clock.Clock> = effect.clock

/**
 * Retreives the `Clock` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category clock
 */
export const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect<R, E, A>) => Effect<R, E, A> = effect.clockWith

/**
 * Sets the implementation of the clock service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withClockScoped: <A extends Clock.Clock>(value: A) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withClockScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * clock service.
 *
 * @since 2.0.0
 * @category clock
 */
export const withClock: {
  <A extends Clock.Clock>(value: A): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends Clock.Clock>(effect: Effect<R, E, A>, value: A): Effect<R, E, A>
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
export const console: Effect<never, never, Console> = _console.console

/**
 * Retreives the `Console` service from the context and provides it to the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category console
 */
export const consoleWith: <R, E, A>(f: (console: Console) => Effect<R, E, A>) => Effect<R, E, A> = _console.consoleWith

/**
 * Sets the implementation of the console service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withConsoleScoped: <A extends Console>(console: A) => Effect<Scope.Scope, never, void> =
  _console.withConsoleScoped

/**
 * Executes the specified workflow with the specified implementation of the
 * console service.
 *
 * @since 2.0.0
 * @category console
 */
export const withConsole: {
  <A extends Console>(console: A): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends Console>(effect: Effect<R, E, A>, console: A): Effect<R, E, A>
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
  (duration: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, duration: Duration.DurationInput): Effect<R, E, A>
} = effect.delay

/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const sleep: (duration: Duration.DurationInput) => Effect<never, never, void> = effect.sleep

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timed: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, [Duration.Duration, A]> = effect.timed

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timedWith: {
  <R1, E1>(
    nanoseconds: Effect<R1, E1, bigint>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, [Duration.Duration, A]>
  <R, E, A, R1, E1>(
    self: Effect<R, E, A>,
    nanoseconds: Effect<R1, E1, bigint>
  ): Effect<R | R1, E | E1, [Duration.Duration, A]>
} = effect.timedWith

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
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeout: {
  (duration: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E | Cause.NoSuchElementException, A>
  <R, E, A>(self: Effect<R, E, A>, duration: Duration.DurationInput): Effect<R, Cause.NoSuchElementException | E, A>
} = circular.timeout

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @since 2.0.0
 * @category delays & timeouts
 */
export const timeoutFail: {
  <E1>(options: {
    readonly onTimeout: LazyArg<E1>
    readonly duration: Duration.DurationInput
  }): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>
  <R, E, A, E1>(self: Effect<R, E, A>, options: {
    readonly onTimeout: LazyArg<E1>
    readonly duration: Duration.DurationInput
  }): Effect<R, E | E1, A>
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
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.DurationInput
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>
  <R, E, A, E1>(
    self: Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.DurationInput
    }
  ): Effect<R, E | E1, A>
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
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B | B1>
  <R, E, A, B, B1>(
    self: Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ): Effect<R, E, B | B1>
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
export const configProviderWith: <R, E, A>(f: (configProvider: ConfigProvider) => Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.configProviderWith

/**
 * Executes the specified workflow with the specified configuration provider.
 *
 * @since 2.0.0
 * @category config
 */
export const withConfigProvider: {
  (value: ConfigProvider): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, value: ConfigProvider): Effect<R, E, A>
} = defaultServices.withConfigProvider

/**
 * Sets the configuration provider to the specified value and restores it to its original value
 * when the scope is closed.
 *
 * @since 2.0.0
 * @category config
 */
export const withConfigProviderScoped: (value: ConfigProvider) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withConfigProviderScoped

// -------------------------------------------------------------------------------------
// context
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category context
 */
export const context: <R>() => Effect<R, never, Context.Context<R>> = core.context

/**
 * Accesses the context of the effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<R, never, A> = effect.contextWith

/**
 * Effectually accesses the context of the effect.
 *
 * @since 2.0.0
 * @category context
 */
export const contextWithEffect: <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect<R, E, A>
) => Effect<R | R0, E, A> = core.contextWithEffect

/**
 * Provides some of the context required to run this effect,
 * leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <E, A>(self: Effect<R, E, A>) => Effect<R0, E, A>
  <R0, R, E, A>(self: Effect<R, E, A>, f: (context: Context.Context<R0>) => Context.Context<R>): Effect<R0, E, A>
} = core.mapInputContext

/**
 * Splits the context into two parts, providing one part using the
 * specified layer/context/runtime and leaving the remainder `R0`
 *
 * @since 2.0.0
 * @category context
 */
export const provide: {
  <R2, E2, A2>(
    layer: Layer.Layer<R2, E2, A2>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | Exclude<R, A2>, E2 | E, A>
  <R2>(context: Context.Context<R2>): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, R2>, E, A>
  <R2>(runtime: Runtime.Runtime<R2>): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, R2>, E, A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, layer: Layer.Layer<R2, E2, A2>): Effect<R2 | Exclude<R, A2>, E | E2, A>
  <R, E, A, R2>(self: Effect<R, E, A>, context: Context.Context<R2>): Effect<Exclude<R, R2>, E, A>
  <R, E, A, R2>(self: Effect<R, E, A>, runtime: Runtime.Runtime<R2>): Effect<Exclude<R, R2>, E, A>
} = layer.effect_provide

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect<R, E, A>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>
} = effect.provideService

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideContext` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect<R1, E1, Context.Tag.Service<T>>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: Effect<R, E, A>,
    tag: T,
    effect: Effect<R1, E1, Context.Tag.Service<T>>
  ): Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
} = effect.provideServiceEffect

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunction: <T extends Context.Tag<any, any>, Args extends Array<any>, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => A
) => (...args: Args) => Effect<Context.Tag.Identifier<T>, never, A> = effect.serviceFunction

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunctionEffect: <T extends Context.Tag<any, any>, Args extends Array<any>, R, E, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => Effect<R, E, A>
) => (...args: Args) => Effect<R | Context.Tag.Identifier<T>, E, A> = effect.serviceFunctionEffect

/**
 * @since 2.0.0
 * @category context
 */
export const serviceFunctions: <I, S>(
  tag: Context.Tag<I, S>
) => {
  [k in { [k in keyof S]: S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never }[keyof S]]:
    S[k] extends (...args: infer Args) => Effect<infer R, infer E, infer A> ? (...args: Args) => Effect<R | I, E, A> :
      never
} = effect.serviceFunctions

/**
 * @since 2.0.0
 * @category context
 */
export const serviceConstants: <I, S>(
  tag: Context.Tag<I, S>
) => {
  [k in { [k in keyof S]: S[k] extends Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends
    Effect<infer R, infer E, infer A> ? Effect<R | I, E, A> : never
} = effect.serviceConstants

/**
 * @since 2.0.0
 * @category context
 */
export const serviceMembers: <I, S>(tag: Context.Tag<I, S>) => {
  functions: {
    [k in { [k in keyof S]: S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never }[keyof S]]:
      S[k] extends (...args: infer Args) => Effect<infer R, infer E, infer A> ? (...args: Args) => Effect<R | I, E, A> :
        never
  }
  constants: {
    [k in { [k in keyof S]: S[k] extends Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends
      Effect<infer R, infer E, infer A> ? Effect<R | I, E, A> : never
  }
} = effect.serviceMembers

/**
 * @since 2.0.0
 * @category context
 */
export const serviceOption: <I, S>(tag: Context.Tag<I, S>) => Effect<never, never, Option.Option<S>> =
  effect.serviceOption

/**
 * @since 2.0.0
 * @category context
 */
export const serviceOptional: <I, S>(tag: Context.Tag<I, S>) => Effect<never, Cause.NoSuchElementException, S> =
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
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R | Context.Tag.Identifier<T>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): Effect<R | Context.Tag.Identifier<T>, E, A>
} = effect.updateService

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category do notation
 */
export const Do: Effect<never, never, {}> = effect.Do

/**
 * Binds an effectful value in a `do` scope
 *
 * @since 2.0.0
 * @category do notation
 */
export const bind: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect<R2, E2, A>
  ): <R, E>(self: Effect<R, E, K>) => Effect<R2 | R, E2 | E, MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect<R2, E2, A>
  ): Effect<R | R2, E | E2, MergeRecord<K, { [k in N]: A }>>
} = effect.bind

/**
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(tag: N): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: Effect<R, E, A>, tag: N): Effect<R, E, Record<N, A>>
} = effect.bindTo

const let_: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <R, E>(self: Effect<R, E, K>) => Effect<R, E, MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(
    self: Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): Effect<R, E, MergeRecord<K, { [k in N]: A }>>
} = effect.bindValue
export {
  /**
   * Like bind for values
   *
   * @since 2.0.0
   * @category do notation
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
export const either: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Either.Either<E, A>> = core.either

/**
 * @since 2.0.0
 * @category conversions
 */
export const exit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Exit.Exit<E, A>> = core.exit

/**
 * @since 2.0.0
 * @category conversions
 */
export const intoDeferred: {
  <E, A>(deferred: Deferred.Deferred<E, A>): <R>(self: Effect<R, E, A>) => Effect<R, never, boolean>
  <R, E, A>(self: Effect<R, E, A>, deferred: Deferred.Deferred<E, A>): Effect<R, never, boolean>
} = core.intoDeferred

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @since 2.0.0
 * @category conversions
 */
export const option: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Option.Option<A>> = effect.option

// -------------------------------------------------------------------------------------
// filtering & conditionals
// -------------------------------------------------------------------------------------

const if_: {
  <R1, R2, E1, E2, A, A1>(
    options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1> }
  ): <R = never, E = never>(self: boolean | Effect<R, E, boolean>) => Effect<R1 | R2 | R, E1 | E2 | E, A | A1>
  <R1, R2, E1, E2, A, A1>(
    self: boolean,
    options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1> }
  ): Effect<R1 | R2, E1 | E2, A | A1>
  <R, E, R1, R2, E1, E2, A, A1>(
    self: Effect<R, E, boolean>,
    options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1> }
  ): Effect<R | R1 | R2, E | E1 | E2, A | A1>
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
  <A, B extends A, X extends A>(
    filter: Refinement<A, B>,
    orDieWith: (a: X) => unknown
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A, X extends A, Y extends A>(
    filter: Predicate<X>,
    orDieWith: (a: Y) => unknown
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, B extends A, X extends A>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orDieWith: (a: X) => unknown
  ): Effect<R, E, B>
  <R, E, A, X extends A, Y extends A>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orDieWith: (a: Y) => unknown
  ): Effect<R, E, A>
} = effect.filterOrDie

/**
 * Filter the specified effect with the provided function, dying with specified
 * message if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrDieMessage: {
  <A, B extends A>(filter: Refinement<A, B>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A, X extends A>(filter: Predicate<X>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, B extends A>(self: Effect<R, E, A>, filter: Refinement<A, B>, message: string): Effect<R, E, B>
  <R, E, A, X extends A>(self: Effect<R, E, A>, filter: Predicate<X>, message: string): Effect<R, E, A>
} = effect.filterOrDieMessage

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrElse: {
  <A, B extends A, X extends A, R2, E2, C>(
    filter: Refinement<A, B>,
    orElse: (a: X) => Effect<R2, E2, C>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B | C>
  <A, X extends A, Y extends A, R2, E2, B>(
    filter: Predicate<X>,
    orElse: (a: Y) => Effect<R2, E2, B>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A | B>
  <R, E, A, B extends A, X extends A, R2, E2, C>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orElse: (a: X) => Effect<R2, E2, C>
  ): Effect<R | R2, E | E2, B | C>
  <R, E, A, X extends A, Y extends A, R2, E2, B>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orElse: (a: Y) => Effect<R2, E2, B>
  ): Effect<R | R2, E | E2, A | B>
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
  <A, B extends A, X extends A, E2>(
    filter: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E2 | E, B>
  <A, X extends A, Y extends A, E2>(
    filter: Predicate<X>,
    orFailWith: (a: Y) => E2
  ): <R, E>(self: Effect<R, E, A>) => Effect<R, E2 | E, A>
  <R, E, A, B extends A, X extends A, E2>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): Effect<R, E | E2, B>
  <R, E, A, X extends A, Y extends A, E2>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orFailWith: (a: Y) => E2
  ): Effect<R, E | E2, A>
} = effect.filterOrFail

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const unless: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
  <R, E, A>(self: Effect<R, E, A>, predicate: LazyArg<boolean>): Effect<R, E, Option.Option<A>>
} = effect.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const unlessEffect: {
  <R2, E2>(
    predicate: Effect<R2, E2, boolean>
  ): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(
    self: Effect<R, E, A>,
    predicate: Effect<R2, E2, boolean>
  ): Effect<R | R2, E | E2, Option.Option<A>>
} = effect.unlessEffect

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const when: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
  <R, E, A>(self: Effect<R, E, A>, predicate: LazyArg<boolean>): Effect<R, E, Option.Option<A>>
} = effect.when

/**
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const whenEffect: {
  <R, E>(
    predicate: Effect<R, E, boolean>
  ): <R2, E2, A>(
    effect: Effect<R2, E2, A>
  ) => Effect<R | R2, E | E2, Option.Option<A>>
  <R, E, A, R2, E2>(
    self: Effect<R2, E2, A>,
    predicate: Effect<R, E, boolean>
  ): Effect<R | R2, E | E2, Option.Option<A>>
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
  ): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E, [S, Option.Option<A>]>
  <R, E, A, S>(
    self: Effect<R, E, A>,
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate<S>
  ): Effect<R, E, [S, Option.Option<A>]>
} = effect.whenFiberRef

/**
 * Executes this workflow when the value of the `Ref` satisfies the predicate.
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const whenRef: {
  <S>(
    ref: Ref.Ref<S>,
    predicate: Predicate<S>
  ): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E, [S, Option.Option<A>]>
  <R, E, A, S>(
    self: Effect<R, E, A>,
    ref: Ref.Ref<S>,
    predicate: Predicate<S>
  ): Effect<R, E, [S, Option.Option<A>]>
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
  <A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B>
  <R, E, A, R1, E1, B>(self: Effect<R, E, A>, f: (a: A) => Effect<R1, E1, B>): Effect<R | R1, E | E1, B>
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
 * import * as Effect from "effect/Effect"
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
  ): <R, E>(
    self: Effect<R, E, A>
  ) => [X] extends [Effect<infer R1, infer E1, infer A1>] ? Effect<R | R1, E | E1, A1>
    : [X] extends [Promise<infer A1>] ? Effect<R, E | Cause.UnknownException, A1>
    : Effect<R, E, X>
  <X>(
    f: X
  ): <R, E, A>(
    self: Effect<R, E, A>
  ) => [X] extends [Effect<infer R1, infer E1, infer A1>] ? Effect<R | R1, E | E1, A1>
    : [X] extends [Promise<infer A1>] ? Effect<R, Cause.UnknownException | E, A1>
    : Effect<R, E, X>
  <A, R, E, X>(
    self: Effect<R, E, A>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Effect<infer R1, infer E1, infer A1>] ? Effect<R | R1, E | E1, A1>
    : [X] extends [Promise<infer A1>] ? Effect<R, Cause.UnknownException | E, A1>
    : Effect<R, E, X>
  <A, R, E, X>(
    self: Effect<R, E, A>,
    f: X
  ): [X] extends [Effect<infer R1, infer E1, infer A1>] ? Effect<R | R1, E | E1, A1>
    : [X] extends [Promise<infer A1>] ? Effect<R, Cause.UnknownException | E, A1>
    : Effect<R, E, X>
} = core.andThen

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <R, E, R1, E1, A>(self: Effect<R, E, Effect<R1, E1, A>>) => Effect<R | R1, E | E1, A> =
  core.flatten

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @since 2.0.0
 * @category sequencing
 */
export const raceAll: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = fiberRuntime.raceAll

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
  <R2, E2, A2>(that: Effect<R2, E2, A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: Effect<R2, E2, A2>): Effect<R | R2, E | E2, A | A2>
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
  <R2, E2, A2>(that: Effect<R2, E2, A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: Effect<R2, E2, A2>): Effect<R | R2, E | E2, A | A2>
} = circular.raceFirst

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const raceWith: {
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    other: Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>
    }
  ): <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    other: Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>
    }
  ): Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>
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
  <R2, E2, B, C>(
    summary: Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, [C, A]>
  <R, E, A, R2, E2, B, C>(
    self: Effect<R, E, A>,
    summary: Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ): Effect<R | R2, E | E2, [C, A]>
} = effect.summarized

/**
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <R, E>(
    self: Effect<R, E, A>
  ) => [X] extends [Effect<infer R1, infer E1, infer _A1>] ? Effect<R | R1, E | E1, A>
    : [X] extends [Promise<infer _A1>] ? Effect<R, E | Cause.UnknownException, A>
    : Effect<R, E, A>
  <X>(
    f: X
  ): <R, E, A>(
    self: Effect<R, E, A>
  ) => [X] extends [Effect<infer R1, infer E1, infer _A1>] ? Effect<R | R1, E | E1, A>
    : [X] extends [Promise<infer _A1>] ? Effect<R, Cause.UnknownException | E, A>
    : Effect<R, E, A>
  <A, R, E, X>(
    self: Effect<R, E, A>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Effect<infer R1, infer E1, infer _A1>] ? Effect<R | R1, E | E1, A>
    : [X] extends [Promise<infer _A1>] ? Effect<R, Cause.UnknownException | E, A>
    : Effect<R, E, A>
  <A, R, E, X>(
    self: Effect<R, E, A>,
    f: X
  ): [X] extends [Effect<infer R1, infer E1, infer _A1>] ? Effect<R | R1, E | E1, A>
    : [X] extends [Promise<infer _A1>] ? Effect<R, Cause.UnknownException | E, A>
    : Effect<R, E, A>
} = core.tap

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(
    options: { readonly onFailure: (e: XE) => Effect<R2, E2, X>; readonly onSuccess: (a: XA) => Effect<R3, E3, X1> }
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E | E2 | E3, A>
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (e: XE) => Effect<R2, E2, X>; readonly onSuccess: (a: XA) => Effect<R3, E3, X1> }
  ): Effect<R | R2 | R3, E | E2 | E3, A>
} = effect.tapBoth

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapDefect: {
  <R2, E2, X>(
    f: (cause: Cause.Cause<never>) => Effect<R2, E2, X>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, X>(
    self: Effect<R, E, A>,
    f: (cause: Cause.Cause<never>) => Effect<R2, E2, X>
  ): Effect<R | R2, E | E2, A>
} = effect.tapDefect

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, XE extends E, R2, E2, X>(
    f: (e: XE) => Effect<R2, E2, X>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A>
  <R, E, XE extends E, A, R2, E2, X>(self: Effect<R, E, A>, f: (e: XE) => Effect<R2, E2, X>): Effect<R | R2, E | E2, A>
} = effect.tapError

/**
 * Returns an effect that effectfully "peeks" at the specific tagged failure of this effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapErrorTag: {
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R | R1, E | E1, A>
  <R, E, A, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1, A1>(
    self: Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): Effect<R | R1, E | E1, A>
} = effect.tapErrorTag

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapErrorCause: {
  <E, XE extends E, R2, E2, X>(
    f: (cause: Cause.Cause<XE>) => Effect<R2, E2, X>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A>
  <R, E, A, XE extends E, R2, E2, X>(
    self: Effect<R, E, A>,
    f: (cause: Cause.Cause<XE>) => Effect<R2, E2, X>
  ): Effect<R | R2, E | E2, A>
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
export const forever: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, never> = effect.forever

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
      readonly body: (b: B) => Effect<R, E, A>
    }
  ): Effect<R, E, A>
  <A, R, E>(
    initial: A,
    options: {
      readonly while: (a: A) => boolean
      readonly body: (a: A) => Effect<R, E, A>
    }
  ): Effect<R, E, A>
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
  <A, B extends A, R, E, C>(
    initial: A,
    options: {
      readonly while: Refinement<A, B>
      readonly step: (b: B) => A
      readonly body: (b: B) => Effect<R, E, C>
      readonly discard?: false | undefined
    }
  ): Effect<R, E, Array<C>>
  <A, R, E, C>(
    initial: A,
    options: {
      readonly while: (a: A) => boolean
      readonly step: (a: A) => A
      readonly body: (a: A) => Effect<R, E, C>
      readonly discard?: false | undefined
    }
  ): Effect<R, E, Array<C>>
  <A, B extends A, R, E, C>(
    initial: A,
    options: {
      readonly while: Refinement<A, B>
      readonly step: (b: B) => A
      readonly body: (b: B) => Effect<R, E, C>
      readonly discard: true
    }
  ): Effect<R, E, void>
  <A, R, E, C>(
    initial: A,
    options: {
      readonly while: (a: A) => boolean
      readonly step: (a: A) => A
      readonly body: (a: A) => Effect<R, E, C>
      readonly discard: true
    }
  ): Effect<R, E, void>
} = effect.loop

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeat: {
  <R1, A extends A0, A0, B>(
    schedule: Schedule.Schedule<R1, A, B>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, B>
  <R, E, A extends A0, A0, R1, B>(self: Effect<R, E, A>, schedule: Schedule.Schedule<R1, A0, B>): Effect<R | R1, E, B>
} = _schedule.repeat_Effect

/**
 * Returns a new effect that repeats this effect the specified number of times
 * or until the first failure. Repeats are in addition to the first execution,
 * so that `io.repeatN(1)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatN: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A>
} = effect.repeatN

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
 * `effect`, and then if that succeeds, executes `effect` an additional time.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatOrElse: {
  <R2, A extends A0, A0, B, E, R3, E2>(
    schedule: Schedule.Schedule<R2, A, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, B>
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2, B>
  <R, E, A extends A0, A0, R2, B, R3, E2>(
    self: Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, B>
  ): Effect<R | R2 | R3, E2, B>
} = _schedule.repeatOrElse_Effect

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatUntil: {
  <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A>(f: Predicate<A>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, B extends A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, B>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, A>
} = _schedule.repeatUntil_Effect

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatUntilEffect: {
  <A, R2, E2>(f: (a: A) => Effect<R2, E2, boolean>): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Effect<R, E, A>, f: (a: A) => Effect<R2, E2, boolean>): Effect<R | R2, E | E2, A>
} = _schedule.repeatUntilEffect_Effect

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatWhile: {
  <A>(f: Predicate<A>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, A>
} = _schedule.repeatWhile_Effect

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const repeatWhileEffect: {
  <R1, A, E2>(f: (a: A) => Effect<R1, E2, boolean>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E2 | E, A>
  <R, E, R1, A, E2>(self: Effect<R, E, A>, f: (a: A) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
} = _schedule.repeatWhileEffect_Effect

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
  <R2, Out>(schedule: Schedule.Schedule<R2, unknown, Out>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, Out>
  <R, E, A, R2, Out>(self: Effect<R, E, A>, schedule: Schedule.Schedule<R2, unknown, Out>): Effect<R | R2, E, Out>
} = _schedule.schedule_Effect

/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @since 2.0.0
 * @category repetition / recursion
 */
export const scheduleForked: {
  <R2, Out>(
    schedule: Schedule.Schedule<R2, unknown, Out>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | R2 | R, never, Fiber.RuntimeFiber<E, Out>>
  <R, E, A, R2, Out>(
    self: Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, Out>
  ): Effect<Scope.Scope | R | R2, never, Fiber.RuntimeFiber<E, Out>>
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
    schedule: Schedule.Schedule<R2, In, Out>
  ): <R, E>(self: Effect<R, E, In>) => Effect<R2 | R, E, Out>
  <R, E, In, R2, Out>(
    self: Effect<R, E, In>,
    initial: In,
    schedule: Schedule.Schedule<R2, In, Out>
  ): Effect<R | R2, E, Out>
} = _schedule.scheduleFrom_Effect

/**
 * @since 2.0.0
 * @category repetition / recursion
 */
export const whileLoop: <R, E, A>(
  options: {
    readonly while: LazyArg<boolean>
    readonly body: LazyArg<Effect<R, E, A>>
    readonly step: (a: A) => void
  }
) => Effect<R, E, void> = core.whileLoop

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
export const getFiberRefs: Effect<never, never, FiberRefs.FiberRefs> = effect.fiberRefs

/**
 * Inherits values from all `FiberRef` instances into current fiber.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const inheritFiberRefs: (childFiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void> =
  effect.inheritFiberRefs

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B, A>(use: Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A): Effect<R, E, B>
} = core.fiberRefLocally

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyWith: {
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B, A>(use: Effect<R, E, B>, self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<R, E, B>
} = core.fiberRefLocallyWith

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyScoped: {
  <A>(value: A): (self: FiberRef.FiberRef<A>) => Effect<Scope.Scope, never, void>
  <A>(self: FiberRef.FiberRef<A>, value: A): Effect<Scope.Scope, never, void>
} = fiberRuntime.fiberRefLocallyScoped

/**
 * @since 2.0.0
 * @category fiber refs
 */
export const locallyScopedWith: {
  <A>(f: (a: A) => A): (self: FiberRef.FiberRef<A>) => Effect<Scope.Scope, never, void>
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<Scope.Scope, never, void>
} = fiberRuntime.fiberRefLocallyScopedWith

/**
 * Applies the specified changes to the `FiberRef` values for the fiber
 * running this workflow.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const patchFiberRefs: (patch: FiberRefsPatch.FiberRefsPatch) => Effect<never, never, void> =
  effect.patchFiberRefs

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const setFiberRefs: (fiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void> = effect.setFiberRefs

/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @since 2.0.0
 * @category fiber refs
 */
export const updateFiberRefs: (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
) => Effect<never, never, void> = effect.updateFiberRefs

// -------------------------------------------------------------------------------------
// getters & folding
// -------------------------------------------------------------------------------------

/**
 * Returns `true` if this effect is a failure, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const isFailure: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean> = effect.isFailure

/**
 * Returns `true` if this effect is a success, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const isSuccess: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean> = effect.isSuccess

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match`.
 *
 * @since 2.0.0
 * @category getters & folding
 */
export const match: {
  <E, A, A2, A3>(
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3>
  <R, E, A, A2, A3>(
    self: Effect<R, E, A>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Effect<R, never, A2 | A3>
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
  ): <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3>
  <R, E, A2, A, A3>(
    self: Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): Effect<R, never, A2 | A3>
} = core.matchCause

/**
 * @since 2.0.0
 * @category getters & folding
 */
export const matchCauseEffect: {
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect<R3, E3, A3>
    }
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect<R3, E3, A3>
    }
  ): Effect<R | R2 | R3, E2 | E3, A2 | A3>
} = core.matchCauseEffect

/**
 * @since 2.0.0
 * @category getters & folding
 */
export const matchEffect: {
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (e: E) => Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect<R3, E3, A3>
    }
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    options: {
      readonly onFailure: (e: E) => Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect<R3, E3, A3>
    }
  ): Effect<R | R2 | R3, E2 | E3, A2 | A3>
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
export const log: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.log

/**
 * Logs the specified message or cause at the Trace log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logTrace: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logTrace

/**
 * Logs the specified message or cause at the Debug log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logDebug: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logDebug

/**
 * Logs the specified message or cause at the Info log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logInfo: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logInfo

/**
 * Logs the specified message or cause at the Warning log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logWarning: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logWarning

/**
 * Logs the specified message or cause at the Error log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logError: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logError

/**
 * Logs the specified message or cause at the Fatal log level.
 *
 * @since 2.0.0
 * @category logging
 */
export const logFatal: <A>(
  messageOrCause: A,
  supplementary?: A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>
) => Effect<never, never, void> = effect.logFatal

/**
 * Adjusts the label for the current logging span.
 *
 * @since 2.0.0
 * @category logging
 */
export const withLogSpan: {
  (label: string): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, label: string): Effect<R, E, A>
} = effect.withLogSpan

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @since 2.0.0
 * @category logging
 */
export const annotateLogs: {
  (key: string, value: unknown): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, unknown>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: unknown): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, unknown>): Effect<R, E, A>
} = effect.annotateLogs

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @since 2.0.0
 * @category logging
 */
export const logAnnotations: Effect<never, never, HashMap.HashMap<string, unknown>> = effect.logAnnotations

/**
 * Decides wether child fibers will report or not unhandled errors via the logger
 *
 * @since 2.0.0
 * @category logging
 */
export const withUnhandledErrorLogLevel: {
  (level: Option.Option<LogLevel>): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, level: Option.Option<LogLevel>): Effect<R, E, B>
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
export const orDie: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A> = core.orDie

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: Effect<R, E, A>) => Effect<R, never, A>
  <R, E, A>(self: Effect<R, E, A>, f: (error: E) => unknown): Effect<R, never, A>
} = core.orDieWith

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElse: {
  <R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: LazyArg<Effect<R2, E2, A2>>): Effect<R | R2, E2, A | A2>
} = core.orElse

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElseFail: {
  <E2>(evaluate: LazyArg<E2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, E, A, E2>(self: Effect<R, E, A>, evaluate: LazyArg<E2>): Effect<R, E2, A>
} = effect.orElseFail

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const orElseSucceed: {
  <A2>(evaluate: LazyArg<A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A2 | A>
  <R, E, A, A2>(self: Effect<R, E, A>, evaluate: LazyArg<A2>): Effect<R, never, A | A2>
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
export const random: Effect<never, never, Random.Random> = effect.random

/**
 * Retreives the `Random` service from the context and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 * @category random
 */
export const randomWith: <R, E, A>(f: (random: Random.Random) => Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.randomWith

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
export const runtime: <R>() => Effect<R, never, Runtime.Runtime<R>> = _runtime.runtime

/**
 * Retrieves an effect that succeeds with the current runtime flags, which
 * govern behavior and features of the runtime system.
 *
 * @since 2.0.0
 * @category runtime
 */
export const getRuntimeFlags: Effect<never, never, RuntimeFlags.RuntimeFlags> = core.runtimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const patchRuntimeFlags: (patch: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<never, never, void> =
  core.updateRuntimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const withRuntimeFlagsPatch: {
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, update: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect<R, E, A>
} = core.withRuntimeFlags

/**
 * @since 2.0.0
 * @category runtime
 */
export const withRuntimeFlagsPatchScoped: (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => Effect<Scope.Scope, never, void> = fiberRuntime.withRuntimeFlagsScoped

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
  (key: string, value: string): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, string>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: string): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, string>): Effect<R, E, A>
} = effect.tagMetrics

/**
 * Tags each metric in this effect with the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const labelMetrics: {
  (labels: Iterable<MetricLabel.MetricLabel>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, labels: Iterable<MetricLabel.MetricLabel>): Effect<R, E, A>
} = effect.labelMetrics

/**
 * Tags each metric in a scope with a the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const tagMetricsScoped: (key: string, value: string) => Effect<Scope.Scope, never, void> =
  fiberRuntime.tagMetricsScoped

/**
 * Tags each metric in a scope with a the specific tag.
 *
 * @since 2.0.0
 * @category metrics
 */
export const labelMetricsScoped: (
  labels: ReadonlyArray<MetricLabel.MetricLabel>
) => Effect<Scope.Scope, never, void> = fiberRuntime.labelMetricsScoped

/**
 * Retrieves the metric labels associated with the current scope.
 *
 * @since 2.0.0
 * @category metrics
 */
export const metricLabels: Effect<never, never, ReadonlyArray<MetricLabel.MetricLabel>> = core.metricLabels

/**
 * @since 2.0.0
 * @category metrics
 */
export const withMetric: {
  <Type, In, Out>(metric: Metric.Metric<Type, In, Out>): <R, E, A extends In>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends In, Type, In, Out>(self: Effect<R, E, A>, metric: Metric.Metric<Type, In, Out>): Effect<R, E, A>
} = effect.withMetric

// -------------------------------------------------------------------------------------
// unify
// -------------------------------------------------------------------------------------

/**
 * Used to unify functions that would otherwise return `Effect<A, B, C> | Effect<D, E, F>`
 *
 * @category unify
 * @since 2.0.0
 */
export const unifiedFn: <Args extends ReadonlyArray<any>, Ret extends Effect<any, any, any>>(
  f: (...args: Args) => Ret
) => (...args: Args) => Effect.Unify<Ret> = core.unified

/**
 * Used to unify effects that would otherwise be `Effect<A, B, C> | Effect<D, E, F>`
 *
 * @category unify
 * @since 2.0.0
 */
export const unified: <Ret extends Effect<any, any, any>>(f: Ret) => Effect.Unify<Ret> = identity

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
  withPermits(permits: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  take(permits: number): Effect<never, never, number>
  release(permits: number): Effect<never, never, void>
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
export const makeSemaphore: (permits: number) => Effect<never, never, Semaphore> = circular.makeSemaphore

// -------------------------------------------------------------------------------------
// execution
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category execution
 */
export const runFork: <E, A>(effect: Effect<never, E, A>) => Fiber.RuntimeFiber<E, A> = _runtime.unsafeForkEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runCallback: <E, A>(
  effect: Effect<never, E, A>,
  onExit?: (exit: Exit.Exit<E, A>) => void
) => Runtime.Cancel<E, A> = _runtime.unsafeRunEffect

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * result of the workflow or rejects with an error.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromise: <E, A>(effect: Effect<never, E, A>) => Promise<A> = _runtime.unsafeRunPromiseEffect

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * `Exit` value of the workflow.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromiseExit: <E, A>(effect: Effect<never, E, A>) => Promise<Exit.Exit<E, A>> =
  _runtime.unsafeRunPromiseExitEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runSync: <E, A>(effect: Effect<never, E, A>) => A = _runtime.unsafeRunSyncEffect

/**
 * @since 2.0.0
 * @category execution
 */
export const runSyncExit: <E, A>(effect: Effect<never, E, A>) => Exit.Exit<E, A> = _runtime.unsafeRunSyncExitEffect

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
  <R1, E1, B>(
    that: Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, [A, B]>
  <R, E, A, R1, E1, B>(
    self: Effect<R, E, A>,
    that: Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R1, E | E1, [A, B]>
} = fiberRuntime.validate

/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @since 2.0.0
 * @category zipping
 */
export const validateWith: {
  <A, R1, E1, B, C>(
    that: Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C>
  <R, E, A, R1, E1, B, C>(
    self: Effect<R, E, A>,
    that: Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R1, E | E1, C>
} = fiberRuntime.validateWith

/**
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R2, E | E2, [A, A2]>
} = fiberRuntime.zipOptions

/**
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R2, E | E2, A>
} = fiberRuntime.zipLeftOptions

/**
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R2, E | E2, A2>
} = fiberRuntime.zipRightOptions

/**
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <R2, E2, A2, A, B>(
    that: Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B>
  <R, E, A, R2, E2, A2, B>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean | undefined
      readonly batching?: boolean | "inherit" | undefined
    }
  ): Effect<R | R2, E | E2, B>
} = fiberRuntime.zipWithOptions

// -------------------------------------------------------------------------------------
// applicatives
// -------------------------------------------------------------------------------------
/**
 * @category combining
 * @since 2.0.0
 */
export const ap: {
  <R2, E2, A>(that: Effect<R2, E2, A>): <R, E, B>(self: Effect<R, E, (a: A) => B>) => Effect<R | R2, E | E2, B>
  <R, E, A, B, R2, E2>(self: Effect<R, E, (a: A) => B>, that: Effect<R2, E2, A>): Effect<R | R2, E | E2, B>
} = dual(
  2,
  <R, E, A, B, R2, E2>(self: Effect<R, E, (a: A) => B>, that: Effect<R2, E2, A>): Effect<R | R2, E | E2, B> =>
    zipWith(self, that, (f, a) => f(a))
)
// -------------------------------------------------------------------------------------
// requests & batching
// -------------------------------------------------------------------------------------

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const blocked: <E, A>(blockedRequests: RequestBlock, _continue: Effect<never, E, A>) => Blocked<E, A> =
  core.blocked

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const runRequestBlock: <R>(blockedRequests: RequestBlock) => Effect<R, never, void> = core.runRequestBlock

/**
 * @category requests & batching
 * @since 2.0.0
 */
export const step: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Exit.Exit<E, A> | Blocked<E, A>> = core.step

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const request: {
  <
    A extends Request.Request<any, any>,
    Ds extends RequestResolver<A, never> | Effect<any, any, RequestResolver<A, never>>
  >(
    request: A,
    dataSource: Ds
  ): Effect<
    [Ds] extends [Effect<any, any, any>] ? Effect.Context<Ds> : never,
    Request.Request.Error<A>,
    Request.Request.Success<A>
  >
} = query.fromRequest as any

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const cacheRequestResult: <A extends Request.Request<any, any>>(
  request: A,
  result: Request.Request.Result<A>
) => Effect<never, never, void> = query.cacheRequest

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestBatching: {
  (requestBatching: boolean): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, requestBatching: boolean): Effect<R, E, A>
} = core.withRequestBatching

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestCaching: {
  (strategy: boolean): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, strategy: boolean): Effect<R, E, A>
} = query.withRequestCaching

/**
 * @since 2.0.0
 * @category requests & batching
 */
export const withRequestCache: {
  (cache: Request.Cache): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, cache: Request.Cache): Effect<R, E, A>
} = query.withRequestCache

// -------------------------------------------------------------------------------------
// tracing
// -------------------------------------------------------------------------------------

/**
 * @since 2.0.0
 * @category tracing
 */
export const tracer: Effect<never, never, Tracer.Tracer> = effect.tracer

/**
 * @since 2.0.0
 * @category tracing
 */
export const tracerWith: <R, E, A>(f: (tracer: Tracer.Tracer) => Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.tracerWith

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracer: {
  (value: Tracer.Tracer): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, value: Tracer.Tracer): Effect<R, E, A>
} = defaultServices.withTracer

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracerScoped: (value: Tracer.Tracer) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withTracerScoped

/**
 * @since 2.0.0
 * @category tracing
 */
export const withTracerTiming: {
  (enabled: boolean): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, enabled: boolean): Effect<R, E, A>
} = core.withTracerTiming

/**
 * Adds an annotation to each span in this effect.
 *
 * @since 2.0.0
 * @category tracing
 */
export const annotateSpans: {
  (key: string, value: unknown): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, unknown>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: unknown): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, unknown>): Effect<R, E, A>
} = effect.annotateSpans

/**
 * Adds an annotation to the current span if available
 *
 * @since 2.0.0
 * @category tracing
 */
export const annotateCurrentSpan: {
  (key: string, value: unknown): Effect<never, never, void>
  (values: Record<string, unknown>): Effect<never, never, void>
} = effect.annotateCurrentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const currentSpan: Effect<never, Cause.NoSuchElementException, Tracer.Span> = effect.currentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const currentParentSpan: Effect<never, Cause.NoSuchElementException, Tracer.ParentSpan> =
  effect.currentParentSpan

/**
 * @since 2.0.0
 * @category tracing
 */
export const spanAnnotations: Effect<never, never, HashMap.HashMap<string, unknown>> = effect.spanAnnotations

/**
 * @since 2.0.0
 * @category tracing
 */
export const spanLinks: Effect<never, never, Chunk.Chunk<Tracer.SpanLink>> = effect.spanLinks

/**
 * For all spans in this effect, add a link with the provided span.
 *
 * @since 2.0.0
 * @category tracing
 */
export const linkSpans: {
  (
    span: Tracer.ParentSpan,
    attributes?: Record<string, unknown>
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(
    self: Effect<R, E, A>,
    span: Tracer.ParentSpan,
    attributes?: Record<string, unknown>
  ): Effect<R, E, A>
} = effect.linkSpans

/**
 * Create a new span for tracing.
 *
 * @since 2.0.0
 * @category tracing
 */
export const makeSpan: (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }
) => Effect<never, never, Tracer.Span> = effect.makeSpan

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
  options?: {
    readonly attributes?: Record<string, unknown> | undefined
    readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
    readonly parent?: Tracer.ParentSpan | undefined
    readonly root?: boolean | undefined
    readonly context?: Context.Context<never> | undefined
  }
) => Effect<Scope.Scope, never, Tracer.Span> = fiberRuntime.makeSpanScoped

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
  <R, E, A>(name: string, evaluate: (span: Tracer.Span) => Effect<R, E, A>): Effect<R, E, A>
  <R, E, A>(
    name: string,
    options: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    },
    evaluate: (span: Tracer.Span) => Effect<R, E, A>
  ): Effect<R, E, A>
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
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(
    self: Effect<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): Effect<Exclude<R, Tracer.ParentSpan>, E, A>
} = effect.withSpan

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
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Tracer.ParentSpan> | Scope.Scope, E, A>
  <R, E, A>(
    self: Effect<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): Effect<Scope.Scope | Exclude<R, Tracer.ParentSpan>, E, A>
} = fiberRuntime.withSpanScoped

/**
 * Adds the provided span to the current span stack.
 *
 * @since 2.0.0
 * @category tracing
 */
export const withParentSpan: {
  (span: Tracer.ParentSpan): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(self: Effect<R, E, A>, span: Tracer.ParentSpan): Effect<Exclude<R, Tracer.ParentSpan>, E, A>
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
export const fromNullable: <A>(value: A) => Effect<never, Cause.NoSuchElementException, NonNullable<A>> =
  effect.fromNullable

/**
 * Wraps the success value of this effect with `Option.some`, and maps
 * `Cause.NoSuchElementException` to `Option.none`.
 *
 * @since 2.0.0
 * @category optionality
 */
export const optionFromOptional: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, Exclude<E, Cause.NoSuchElementException>, Option.Option<A>> = effect.optionFromOptional
