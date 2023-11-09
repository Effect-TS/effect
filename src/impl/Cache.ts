/**
 * @since 2.0.0
 */
import type { Cache } from "../Cache.js"
import type * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import type * as Exit from "../Exit.js"
import * as internal from "../internal/cache.js"
import type * as Option from "../Option.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const CacheTypeId: unique symbol = internal.CacheTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type CacheTypeId = typeof CacheTypeId

/**
 * A ConsumerCache models a portion of a cache which is safe to share without allowing to create new values or access existing ones.
 *
 * It can be used safely to give over control for request management without leaking writer side details.
 *
 * @since 2.0.0
 * @category models
 */
export interface ConsumerCache<Key, Error, Value> extends Cache.Variance<Key, Error, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns `Option.none`.
   */
  getOption(key: Key): Effect.Effect<never, Error, Option.Option<Value>>

  /**
   * Retrieves the value associated with the specified key if it exists and the
   * lookup function has completed. Otherwise returns `Option.none`.
   */
  getOptionComplete(key: Key): Effect.Effect<never, never, Option.Option<Value>>

  /**
   * Returns statistics for this cache.
   */
  cacheStats(): Effect.Effect<never, never, CacheStats>

  /**
   * Returns whether a value associated with the specified key exists in the
   * cache.
   */
  contains(key: Key): Effect.Effect<never, never, boolean>

  /**
   * Returns statistics for the specified entry.
   */
  entryStats(key: Key): Effect.Effect<never, never, Option.Option<EntryStats>>

  /**
   * Invalidates the value associated with the specified key.
   */
  invalidate(key: Key): Effect.Effect<never, never, void>

  /**
   * Invalidates the value associated with the specified key if the predicate holds.
   */
  invalidateWhen(key: Key, when: (value: Value) => boolean): Effect.Effect<never, never, void>

  /**
   * Invalidates all values in the cache.
   */
  invalidateAll(): Effect.Effect<never, never, void>

  /**
   * Returns the approximate number of values in the cache.
   */
  size(): Effect.Effect<never, never, number>

  /**
   * Returns an approximation of the values in the cache.
   */
  keys<Key, Error, Value>(this: ConsumerCache<Key, Error, Value>): Effect.Effect<never, never, Array<Key>>

  /**
   * Returns an approximation of the values in the cache.
   */
  values(): Effect.Effect<never, never, Array<Value>>

  /**
   * Returns an approximation of the values in the cache.
   */
  entries<Key, Error, Value>(this: ConsumerCache<Key, Error, Value>): Effect.Effect<never, never, Array<[Key, Value]>>
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
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
    readonly lookup: Lookup<Key, Environment, Error, Value>
  }
) => Effect.Effect<Environment, never, Cache<Key, Error, Value>> = internal.make

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
) => Effect.Effect<Environment, never, Cache<Key, Error, Value>> = internal.makeWith

/**
 * `CacheStats` represents a snapshot of statistics for the cache as of a
 * point in time.
 *
 * @since 2.0.0
 * @category models
 */
export interface CacheStats {
  readonly hits: number
  readonly misses: number
  readonly size: number
}

/**
 * Constructs a new `CacheStats` from the specified values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeCacheStats: (
  options: {
    readonly hits: number
    readonly misses: number
    readonly size: number
  }
) => CacheStats = internal.makeCacheStats

/**
 * Represents a snapshot of statistics for an entry in the cache.
 *
 * @since 2.0.0
 * @category models
 */
export interface EntryStats {
  readonly loadedMillis: number
}

/**
 * Constructs a new `EntryStats` from the specified values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeEntryStats: (loadedMillis: number) => EntryStats = internal.makeEntryStats

/**
 * A `Lookup` represents a lookup function that, given a key of type `Key`, can
 * return an effect that will either produce a value of type `Value` or fail
 * with an error of type `Error` using an environment of type `Environment`.
 *
 * @since 2.0.0
 * @category models
 */
export type Lookup<Key, Environment, Error, Value> = (key: Key) => Effect.Effect<Environment, Error, Value>
