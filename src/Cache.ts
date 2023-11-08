import type { CacheTypeId, ConsumerCache } from "./Cache.impl.js"
import type { Effect } from "./Effect.js"
import type { Either } from "./Either.js"

export * from "./Cache.impl.js"
export * from "./internal/Jumpers/Cache.js"

/**
 * A `Cache` is defined in terms of a lookup function that, given a key of
 * type `Key`, can either fail with an error of type `Error` or succeed with a
 * value of type `Value`. Getting a value from the cache will either return
 * the previous result of the lookup function if it is available or else
 * compute a new result with the lookup function, put it in the cache, and
 * return it.
 *
 * A cache also has a specified capacity and time to live. When the cache is
 * at capacity the least recently accessed values in the cache will be
 * removed to make room for new values. Getting a value with a life older than
 * the specified time to live will result in a new value being computed with
 * the lookup function and returned when available.
 *
 * The cache is safe for concurrent access. If multiple fibers attempt to get
 * the same key the lookup function will only be computed once and the result
 * will be returned to all fibers.
 *
 * @since 2.0.0
 * @category models
 */
export interface Cache<Key, Error, Value> extends ConsumerCache<Key, Error, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise computes the value with the lookup function, puts it in the
   * cache, and returns it.
   */
  get(key: Key): Effect<never, Error, Value>

  /**
   * Retrieves the value associated with the specified key if it exists as a left.
   * Otherwise computes the value with the lookup function, puts it in the
   * cache, and returns it as a right.
   */
  getEither(key: Key): Effect<never, Error, Either<Value, Value>>

  /**
   * Computes the value associated with the specified key, with the lookup
   * function, and puts it in the cache. The difference between this and
   * `get` method is that `refresh` triggers (re)computation of the value
   * without invalidating it in the cache, so any request to the associated
   * key can still be served while the value is being re-computed/retrieved
   * by the lookup function. Additionally, `refresh` always triggers the
   * lookup function, disregarding the last `Error`.
   */
  refresh(key: Key): Effect<never, Error, void>

  /**
   * Associates the specified value with the specified key in the cache.
   */
  set<Key, Error, Value>(this: Cache<Key, Error, Value>, key: Key, value: Value): Effect<never, never, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Cache {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Key, Error, Value> {
    readonly [CacheTypeId]: {
      readonly _Key: (_: Key) => void
      readonly _Error: (_: never) => Error
      readonly _Value: (_: never) => Value
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Cache.impl.js"
}
