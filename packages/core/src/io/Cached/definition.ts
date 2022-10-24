export const CachedURI = Symbol.for("@effect/core/io/Cached")
export type CachedURI = typeof CachedURI

/**
 * A `Cached` is a possibly resourceful value that is loaded into memory, and
 * which can be refreshed either manually or automatically.
 *
 * @tsplus type effect/core/io/Cached
 * @category model
 * @since 1.0.0
 */
export interface Cached<Error, Resource> {
  readonly [CachedURI]: {
    _Error: (_: never) => Error
    _Resource: (_: never) => Resource
  }

  /**
   * Retrieves the current value stored in the cache.
   */
  get get(): Effect<never, Error, Resource>

  /**
   * Refreshes the cache. This method will not return until either the refresh
   * is successful, or the refresh operation fails.
   */
  get refresh(): Effect<never, Error, void>
}

/**
 * @tsplus type effect/core/io/Cached.Ops
 * @category model
 * @since 1.0.0
 */
export interface CachedOps {}
export const Cached: CachedOps = {}
