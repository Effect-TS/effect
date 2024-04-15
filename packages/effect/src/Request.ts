/**
 * @since 2.0.0
 */
import type * as _Cache from "./Cache.js"
import type { Cause } from "./Cause.js"
import type { Deferred } from "./Deferred.js"
import type { DurationInput } from "./Duration.js"
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import type { FiberId } from "./FiberId.js"
import * as _RequestBlock from "./internal/blockedRequests.js"
import * as cache from "./internal/cache.js"
import * as core from "./internal/core.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as internal from "./internal/request.js"
import type * as Option from "./Option.js"
import type * as Types from "./Types.js"

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
 * A `Request<A, E>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Request<out A, out E = never> extends Request.Variance<A, E> {}

/**
 * @since 2.0.0
 */
export declare namespace Request {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out A, out E> {
    readonly [RequestTypeId]: {
      readonly _A: Types.Covariant<A>
      readonly _E: Types.Covariant<E>
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<R extends Request<any, any>, T extends keyof R = never> {
    (args: Omit<R, T | keyof (Request.Variance<Request.Success<R>, Request.Error<R>>)>): R
  }

  /**
   * A utility type to extract the error type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Request<any, any>> = [T] extends [Request<infer _A, infer _E>] ? _E : never

  /**
   * A utility type to extract the value type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Request<any, any>> = [T] extends [Request<infer _A, infer _E>] ? _A : never

  /**
   * A utility type to extract the result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Result<T extends Request<any, any>> = T extends Request<infer A, infer E> ? Exit.Exit<A, E> : never

  /**
   * A utility type to extract the optional result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type OptionalResult<T extends Request<any, any>> = T extends Request<infer A, infer E>
    ? Exit.Exit<Option.Option<A>, E>
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
 * Provides a constructor for a Request Class.
 *
 * @example
 * import * as Request from "effect/Request"
 *
 * type Success = string
 * type Error = never
 *
 * class MyRequest extends Request.Class<Success, Error, {
 *   readonly id: string
 * }> {}
 *
 * @since 2.0.0
 * @category constructors
 */
export const Class: new<Success, Error, A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Request<unknown, unknown>>, {}> extends true ? void
    : { readonly [P in keyof A as P extends keyof Request<unknown, unknown> ? never : P]: A[P] }
) => Request<Success, Error> & Readonly<A> = internal.Class as any

/**
 * Provides a Tagged constructor for a Request Class.
 *
 * @example
 * import * as Request from "effect/Request"
 *
 * type Success = string
 * type Error = never
 *
 * class MyRequest extends Request.TaggedClass("MyRequest")<Success, Error, {
 *   readonly name: string
 * }> {}
 *
 * @since 2.0.0
 * @category constructors
 */
export const TaggedClass: <Tag extends string>(
  tag: Tag
) => new<Success, Error, A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Request<unknown, unknown>>, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" | keyof Request<unknown, unknown> ? never : P]: A[P] }
) => Request<Success, Error> & Readonly<A> & { readonly _tag: Tag } = internal.TaggedClass as any

/**
 * Complete a `Request` with the specified result.
 *
 * @since 2.0.0
 * @category request completion
 */
export const complete: {
  <A extends Request<any, any>>(result: Request.Result<A>): (self: A) => Effect.Effect<void>
  <A extends Request<any, any>>(self: A, result: Request.Result<A>): Effect.Effect<void>
} = internal.complete

/**
 * Interrupts the child effect when requests are no longer needed
 *
 * @since 2.0.0
 * @category request completion
 */
export const interruptWhenPossible: {
  (all: Iterable<Request<any, any>>): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<void, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, all: Iterable<Request<any, any>>): Effect.Effect<void, E, R>
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
    effect: Effect.Effect<Request.Success<A>, Request.Error<A>, R>
  ): (self: A) => Effect.Effect<void, never, R>
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<Request.Success<A>, Request.Error<A>, R>
  ): Effect.Effect<void, never, R>
} = internal.completeEffect

/**
 * Complete a `Request` with the specified error.
 *
 * @since 2.0.0
 * @category request completion
 */
export const fail: {
  <A extends Request<any, any>>(error: Request.Error<A>): (self: A) => Effect.Effect<void>
  <A extends Request<any, any>>(self: A, error: Request.Error<A>): Effect.Effect<void>
} = internal.fail

/**
 * Complete a `Request` with the specified cause.
 *
 * @since 2.0.0
 * @category request completion
 */
export const failCause: {
  <A extends Request<any, any>>(cause: Cause<Request.Error<A>>): (self: A) => Effect.Effect<void>
  <A extends Request<any, any>>(self: A, cause: Cause<Request.Error<A>>): Effect.Effect<void>
} = internal.failCause

/**
 * Complete a `Request` with the specified value.
 *
 * @since 2.0.0
 * @category request completion
 */
export const succeed: {
  <A extends Request<any, any>>(value: Request.Success<A>): (self: A) => Effect.Effect<void>
  <A extends Request<any, any>>(self: A, value: Request.Success<A>): Effect.Effect<void>
} = internal.succeed

/**
 * @category models
 * @since 2.0.0
 */
export interface Listeners {
  readonly count: number
  readonly observers: Set<(count: number) => void>
  interrupted: boolean
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
  _Cache.ConsumerCache<Request<any, any>, {
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
): Effect.Effect<Cache> =>
  cache.make({
    ...options,
    lookup: () =>
      core.map(core.deferredMake<unknown, unknown>(), (handle) => ({ listeners: new internal.Listeners(), handle }))
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
export interface Entry<out R> extends Entry.Variance<R> {
  readonly request: R
  readonly result: Deferred<
    [R] extends [Request<infer _A, infer _E>] ? _A : never,
    [R] extends [Request<infer _A, infer _E>] ? _E : never
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
  export interface Variance<out R> {
    readonly [EntryTypeId]: {
      readonly _R: Types.Covariant<R>
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
