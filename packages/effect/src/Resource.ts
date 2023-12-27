/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import * as internal from "./internal/resource.js"
import type * as Schedule from "./Schedule.js"
import type * as Scope from "./Scope.js"
import type * as ScopedRef from "./ScopedRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ResourceTypeId: unique symbol = internal.ResourceTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ResourceTypeId = typeof ResourceTypeId

/**
 * A `Resource` is a possibly resourceful value that is loaded into memory, and
 * which can be refreshed either manually or automatically.
 *
 * @since 2.0.0
 * @category models
 */
export interface Resource<in out E, in out A> extends Resource.Variance<E, A> {
  /** @internal */
  readonly scopedRef: ScopedRef.ScopedRef<Exit.Exit<E, A>>
  /** @internal */
  readonly acquire: Effect.Effect<Scope.Scope, E, A>
}

/**
 * @since 2.0.0
 */
export declare namespace Resource {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out E, in out A> {
    readonly [ResourceTypeId]: {
      _E: Types.Invariant<E>
      _A: Types.Invariant<A>
    }
  }
}

/**
 * Creates a new `Resource` value that is automatically refreshed according to
 * the specified policy. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @since 2.0.0
 * @category constructors
 */
export const auto: <R, E, A, R2, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, unknown, Out>
) => Effect.Effect<Scope.Scope | R | R2, never, Resource<E, A>> = internal.auto

/**
 * Retrieves the current value stored in the cache.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <E, A>(self: Resource<E, A>) => Effect.Effect<never, E, A> = internal.get

/**
 * Creates a new `Resource` value that must be manually refreshed by calling
 * the refresh method. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @since 2.0.0
 * @category constructors
 */
export const manual: <R, E, A>(
  acquire: Effect.Effect<R, E, A>
) => Effect.Effect<Scope.Scope | R, never, Resource<E, A>> = internal.manual

/**
 * Refreshes the cache. This method will not return until either the refresh
 * is successful, or the refresh operation fails.
 *
 * @since 2.0.0
 * @category utils
 */
export const refresh: <E, A>(self: Resource<E, A>) => Effect.Effect<never, E, void> = internal.refresh
