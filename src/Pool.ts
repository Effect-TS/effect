/**
 * @since 2.0.0
 */
import type * as Data from "./Data"
import type * as Duration from "./Duration"
import type * as Effect from "./Effect"
import * as internal from "./internal/pool"
import type { Pipeable } from "./Pipeable"
import type * as Scope from "./Scope"

/**
 * @since 2.0.0
 * @category symbols
 */
export const PoolTypeId: unique symbol = internal.PoolTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type PoolTypeId = typeof PoolTypeId

/**
 * A `Pool<E, A>` is a pool of items of type `A`, each of which may be
 * associated with the acquisition and release of resources. An attempt to get
 * an item `A` from a pool may fail with an error of type `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Pool<E, A> extends Data.Case, Pool.Variance<E, A>, Pipeable {
  /**
   * Retrieves an item from the pool in a scoped effect. Note that if
   * acquisition fails, then the returned effect will fail for that same reason.
   * Retrying a failed acquisition attempt will repeat the acquisition attempt.
   */
  get(): Effect.Effect<Scope.Scope, E, A>

  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  invalidate(item: A): Effect.Effect<never, never, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Pool {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [PoolTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns `true` if the specified value is a `Pool`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isPool: (u: unknown) => u is Pool<unknown, unknown> = internal.isPool

/**
 * Makes a new pool of the specified fixed size. The pool is returned in a
 * `Scope`, which governs the lifetime of the pool. When the pool is shutdown
 * because the `Scope` is closed, the individual items allocated by the pool
 * will be released in some unspecified order.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <R, E, A>(
  options: {
    readonly acquire: Effect.Effect<R, E, A>
    readonly size: number
  }
) => Effect.Effect<Scope.Scope | R, never, Pool<E, A>> = internal.make

/**
 * Makes a new pool with the specified minimum and maximum sizes and time to
 * live before a pool whose excess items are not being used will be shrunk
 * down to the minimum size. The pool is returned in a `Scope`, which governs
 * the lifetime of the pool. When the pool is shutdown because the `Scope` is
 * used, the individual items allocated by the pool will be released in some
 * unspecified order.
 *
 * ```ts
 * import * as Duration from "./Duration"
 * import * as Effect from "effect/Effect"
 * import * as Pool from "effect/Pool"
 * import * as Scope from "effect/Scope"
 * import { pipe } from "./Function"
 *
 * Effect.scoped(
 *   pipe(
 *     Pool.make(acquireDbConnection, 10, 20, Duration.seconds(60)),
 *     Effect.flatMap((pool) =>
 *       Effect.scoped(
 *         pipe(
 *           pool.get(),
 *           Effect.flatMap((connection) => useConnection(connection))
 *         )
 *       )
 *     )
 *   )
 * )
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithTTL: <R, E, A>(options: {
  readonly acquire: Effect.Effect<R, E, A>
  readonly min: number
  readonly max: number
  readonly timeToLive: Duration.DurationInput
}) => Effect.Effect<Scope.Scope | R, never, Pool<E, A>> = internal.makeWithTTL

/**
 * Retrieves an item from the pool in a scoped effect. Note that if
 * acquisition fails, then the returned effect will fail for that same reason.
 * Retrying a failed acquisition attempt will repeat the acquisition attempt.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <E, A>(self: Pool<E, A>) => Effect.Effect<Scope.Scope, E, A> = internal.get

/**
 * Invalidates the specified item. This will cause the pool to eventually
 * reallocate the item, although this reallocation may occur lazily rather
 * than eagerly.
 *
 * @since 2.0.0
 * @category combinators
 */
export const invalidate: {
  <A>(value: A): <E>(self: Pool<E, A>) => Effect.Effect<Scope.Scope, never, void>
  <E, A>(self: Pool<E, A>, value: A): Effect.Effect<Scope.Scope, never, void>
} = internal.invalidate
