/**
 * @since 2.0.0
 */
import type { Duration } from "../Duration.js"
import type { Effect } from "../Effect.js"
import * as internal from "../internal/pool.js"
import type { Scope } from "../Scope.js"

import type { Pool } from "../Pool.js"

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
    readonly acquire: Effect<R, E, A>
    readonly size: number
  }
) => Effect<Scope | R, never, Pool<E, A>> = internal.make

/**
 * Makes a new pool with the specified minimum and maximum sizes and time to
 * live before a pool whose excess items are not being used will be shrunk
 * down to the minimum size. The pool is returned in a `Scope`, which governs
 * the lifetime of the pool. When the pool is shutdown because the `Scope` is
 * used, the individual items allocated by the pool will be released in some
 * unspecified order.
 *
 * ```ts
 * import { Duration } from "../Duration"
 * import { Effect } from "effect/Effect"
 * import { Pool } from "effect/Pool"
 * import { Scope } from "effect/Scope"
 * import { pipe } from "../Function"
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
  readonly acquire: Effect<R, E, A>
  readonly min: number
  readonly max: number
  readonly timeToLive: Duration.DurationInput
}) => Effect<Scope | R, never, Pool<E, A>> = internal.makeWithTTL

/**
 * Retrieves an item from the pool in a scoped effect. Note that if
 * acquisition fails, then the returned effect will fail for that same reason.
 * Retrying a failed acquisition attempt will repeat the acquisition attempt.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <E, A>(self: Pool<E, A>) => Effect<Scope, E, A> = internal.get

/**
 * Invalidates the specified item. This will cause the pool to eventually
 * reallocate the item, although this reallocation may occur lazily rather
 * than eagerly.
 *
 * @since 2.0.0
 * @category combinators
 */
export const invalidate: {
  <A>(value: A): <E>(self: Pool<E, A>) => Effect<Scope, never, void>
  <E, A>(self: Pool<E, A>, value: A): Effect<Scope, never, void>
} = internal.invalidate
