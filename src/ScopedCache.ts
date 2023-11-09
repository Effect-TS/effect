import type { Cache } from "./Cache.js"
import type { Effect } from "./Effect.js"
import type { ScopedCacheTypeId } from "./impl/ScopedCache.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Scope } from "./Scope.js"

export * from "./impl/ScopedCache.js"
export * from "./internal/Jumpers/ScopedCache.js"

export declare namespace ScopedCache {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ScopedCache.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface ScopedCache<Key, Error, Value> extends ScopedCache.Variance<Key, Error, Value>, Pipeable {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns `Option.none`.
   */
  getOption(key: Key): Effect<Scope, Error, Option<Value>>

  /**
   * Retrieves the value associated with the specified key if it exists and the
   * lookup function has completed. Otherwise returns `Option.none`.
   */
  getOptionComplete(key: Key): Effect<Scope, never, Option<Value>>

  /**
   * Returns statistics for this cache.
   */
  cacheStats(): Effect<never, never, Cache.CacheStats>

  /**
   * Return whether a resource associated with the specified key exists in the
   * cache. Sometime `contains` can return true if the resource is currently
   * being created but not yet totally created.
   */
  contains(key: Key): Effect<never, never, boolean>

  /**
   * Return statistics for the specified entry.
   */
  entryStats(key: Key): Effect<never, never, Option<Cache.EntryStats>>

  /**
   * Gets the value from the cache if it exists or otherwise computes it, the
   * release action signals to the cache that the value is no longer being used
   * and can potentially be finalized subject to the policies of the cache.
   */
  get(key: Key): Effect<Scope, Error, Value>

  /**
   * Invalidates the resource associated with the specified key.
   */
  invalidate(key: Key): Effect<never, never, void>

  /**
   * Invalidates all values in the cache.
   */
  invalidateAll(): Effect<never, never, void>

  /**
   * Force the reuse of the lookup function to compute the returned scoped
   * effect associated with the specified key immediately. Once the new resource
   * is recomputed, the old resource associated to the key is cleaned (once all
   * fiber using it are done with it). During the time the new resource is
   * computed, concurrent call the .get will use the old resource if this one is
   * not expired.
   */
  refresh(key: Key): Effect<never, Error, void>

  /**
   * Returns the approximate number of values in the cache.
   */
  size(): Effect<never, never, number>
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
