/**
 * @since 2.0.0
 */
import type * as Cache from "./Cache.js"
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import * as internal from "./internal/scopedCache.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Scope from "./Scope.js"

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
 * @since 2.0.0
 * @category models
 */
export interface ScopedCache<Key, Error, Value> extends ScopedCache.Variance<Key, Error, Value>, Pipeable {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns `Option.none`.
   */
  readonly getOption: (key: Key) => Effect.Effect<Scope.Scope, Error, Option.Option<Value>>

  /**
   * Retrieves the value associated with the specified key if it exists and the
   * lookup function has completed. Otherwise returns `Option.none`.
   */
  readonly getOptionComplete: (key: Key) => Effect.Effect<Scope.Scope, never, Option.Option<Value>>

  /**
   * Returns statistics for this cache.
   */
  readonly cacheStats: Effect.Effect<never, never, Cache.CacheStats>

  /**
   * Return whether a resource associated with the specified key exists in the
   * cache. Sometime `contains` can return true if the resource is currently
   * being created but not yet totally created.
   */
  readonly contains: (key: Key) => Effect.Effect<never, never, boolean>

  /**
   * Return statistics for the specified entry.
   */
  readonly entryStats: (key: Key) => Effect.Effect<never, never, Option.Option<Cache.EntryStats>>

  /**
   * Gets the value from the cache if it exists or otherwise computes it, the
   * release action signals to the cache that the value is no longer being used
   * and can potentially be finalized subject to the policies of the cache.
   */
  readonly get: (key: Key) => Effect.Effect<Scope.Scope, Error, Value>

  /**
   * Invalidates the resource associated with the specified key.
   */
  readonly invalidate: (key: Key) => Effect.Effect<never, never, void>

  /**
   * Invalidates all values in the cache.
   */
  readonly invalidateAll: Effect.Effect<never, never, void>

  /**
   * Force the reuse of the lookup function to compute the returned scoped
   * effect associated with the specified key immediately. Once the new resource
   * is recomputed, the old resource associated to the key is cleaned (once all
   * fiber using it are done with it). During the time the new resource is
   * computed, concurrent call the .get will use the old resource if this one is
   * not expired.
   */
  readonly refresh: (key: Key) => Effect.Effect<never, Error, void>

  /**
   * Returns the approximate number of values in the cache.
   */
  readonly size: Effect.Effect<never, never, number>
}

/**
 * @since 2.0.0
 */
export declare namespace ScopedCache {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Key, Error, Value> {
    readonly [ScopedCacheTypeId]: {
      _Key: (_: Key) => void
      _Error: (_: never) => Error
      _Value: (_: never) => Value
    }
  }
}

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
