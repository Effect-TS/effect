/**
 * @since 2.0.0
 */
import type * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import type * as Exit from "../Exit.js"
import * as internal from "../internal/scopedCache.js"
import type * as Scope from "../Scope.js"
import type { ScopedCache } from "../ScopedCache.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ScopedCacheTypeId: unique symbol = internal.ScopedCacheTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ScopedCacheTypeId = typeof ScopedCacheTypeId

/**
 * Constructs a new cache with the specified capacity, time to live, and
 * lookup function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Key, Environment, Error, Value>(
  options: {
    readonly lookup: Lookup<Key, Environment, Error, Value>
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
  }
) => Effect.Effect<Scope.Scope | Environment, never, ScopedCache<Key, Error, Value>> = internal.make

/**
 * Constructs a new cache with the specified capacity, time to live, and
 * lookup function, where the time to live can depend on the `Exit` value
 * returned by the lookup function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWith: <Key, Environment, Error, Value>(
  options: {
    readonly capacity: number
    readonly lookup: Lookup<Key, Environment, Error, Value>
    readonly timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.DurationInput
  }
) => Effect.Effect<Scope.Scope | Environment, never, ScopedCache<Key, Error, Value>> = internal.makeWith

/**
 * Similar to `Cache.Lookup`, but executes the lookup function within a `Scope`.
 *
 * @since 2.0.0
 * @category models
 */
export type Lookup<Key, Environment, Error, Value> = (
  key: Key
) => Effect.Effect<Environment | Scope.Scope, Error, Value>
