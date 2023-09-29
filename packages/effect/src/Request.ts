/**
 * @since 2.0.0
 */
import type * as _Cache from "./Cache"
import type * as Data from "./Data"
import type { Deferred } from "./Deferred"
import type { DurationInput } from "./Duration"
import type * as Effect from "./Effect"
import type * as Exit from "./Exit"
import type { FiberId } from "./FiberId"
import * as _RequestBlock from "./internal/blockedRequests"
import * as cache from "./internal/cache"
import * as core from "./internal/core"
import * as fiberRuntime from "./internal/fiberRuntime"
import * as internal from "./internal/request"
import type * as Option from "./Option"

/**
 * @since 2.0.0
 * @category symbols
 */
export const RequestTypeId: unique symbol = internal.RequestTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type RequestTypeId = typeof RequestTypeId

/**
 * A `Request<E, A>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Request<E, A> extends Request.Variance<E, A>, Data.Case {}

/**
 * @since 2.0.0
 */
export declare namespace Request {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [RequestTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<R extends Request<any, any>, T extends keyof R = never> {
    (args: Omit<R, T | keyof (Data.Case & Request.Variance<Request.Error<R>, Request.Success<R>>)>): R
  }

  /**
   * A utility type to extract the error type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _E : never

  /**
   * A utility type to extract the value type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _A : never

  /**
   * A utility type to extract the result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Result<T extends Request<any, any>> = T extends Request<infer E, infer A> ? Exit.Exit<E, A> : never

  /**
   * A utility type to extract the optional result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type OptionalResult<T extends Request<any, any>> = T extends Request<infer E, infer A>
    ? Exit.Exit<E, Option.Option<A>>
    : never
}

/**
 * Returns `true` if the specified value is a `Request`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isRequest: (u: unknown) => u is Request<unknown, unknown> = internal.isRequest

/**
 * Constructs a new `Request`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const of: <R extends Request<any, any>>() => Request.Constructor<R> = internal.of

/**
 * Constructs a new `Request`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const tagged: <R extends Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
) => Request.Constructor<R, "_tag"> = internal.tagged

/**
 * Complete a `Request` with the specified result.
 *
 * @since 2.0.0
 * @category request completion
 */
export const complete: {
  <A extends Request<any, any>>(result: Request.Result<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, result: Request.Result<A>): Effect.Effect<never, never, void>
} = internal.complete

/**
 * Interrupts the child effect when requests are no longer needed
 *
 * @since 2.0.0
 * @category request completion
 */
export const interruptWhenPossible: {
  (all: Iterable<Request<any, any>>): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
  <R, E, A>(self: Effect.Effect<R, E, A>, all: Iterable<Request<any, any>>): Effect.Effect<R, E, void>
} = fiberRuntime.interruptWhenPossible

/**
 * Complete a `Request` with the specified effectful computation, failing the
 * request with the error from the effect workflow if it fails, and completing
 * the request with the value of the effect workflow if it succeeds.
 *
 * @since 2.0.0
 * @category request completion
 */
export const completeEffect: {
  <A extends Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): (self: A) => Effect.Effect<R, never, void>
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): Effect.Effect<R, never, void>
} = internal.completeEffect

/**
 * Complete a `Request` with the specified error.
 *
 * @since 2.0.0
 * @category request completion
 */
export const fail: {
  <A extends Request<any, any>>(error: Request.Error<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, error: Request.Error<A>): Effect.Effect<never, never, void>
} = internal.fail

/**
 * Complete a `Request` with the specified value.
 *
 * @since 2.0.0
 * @category request completion
 */
export const succeed: {
  <A extends Request<any, any>>(value: Request.Success<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, value: Request.Success<A>): Effect.Effect<never, never, void>
} = internal.succeed

/**
 * @category models
 * @since 2.0.0
 */
export interface Listeners {
  count: number
  observers: Set<(count: number) => void>
  addObserver(f: (count: number) => void): void
  removeObserver(f: (count: number) => void): void
  increment(): void
  decrement(): void
}

/**
 * @category models
 * @since 2.0.0
 */
export interface Cache extends
  _Cache.ConsumerCache<Request<any, any>, never, {
    listeners: Listeners
    handle: Deferred<unknown, unknown>
  }>
{}

/**
 * @since 2.0.0
 * @category models
 */
export const makeCache = (
  options: {
    readonly capacity: number
    readonly timeToLive: DurationInput
  }
): Effect.Effect<never, never, Cache> =>
  cache.make({
    ...options,
    lookup: () => core.map(core.deferredMake(), (handle) => ({ listeners: new internal.Listeners(), handle }))
  })

/**
 * @since 2.0.0
 * @category symbols
 */
export const EntryTypeId = Symbol.for("effect/RequestBlock.Entry")

/**
 * @since 2.0.0
 * @category symbols
 */
export type EntryTypeId = typeof EntryTypeId

/**
 * A `Entry<A>` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 *
 * @since 2.0.0
 * @category models
 */
export interface Entry<R> extends Entry.Variance<R> {
  readonly request: R
  readonly result: Deferred<
    [R] extends [Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request<infer _E, infer _A>] ? _A : never
  >
  readonly listeners: Listeners
  readonly ownerId: FiberId
  readonly state: {
    completed: boolean
  }
}

/**
 * @since 2.0.0
 * @category models
 */
export declare namespace Entry {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<R> {
    readonly [EntryTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/**
 * @since 2.0.0
 * @category guards
 */
export const isEntry = _RequestBlock.isEntry

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeEntry = _RequestBlock.makeEntry
