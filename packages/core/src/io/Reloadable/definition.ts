export const ReloadableURI = Symbol.for("@effect/core/io/Reloadable")
export type ReloadableURI = typeof ReloadableURI

/**
 * A `Reloadable` is an implementation of some service that can be dynamically
 * reloaded, or swapped out for another implementation on-the-fly.
 *
 * @tsplus type effect/core/io/Reloadable
 */
export interface Reloadable<Service> {
  readonly [ReloadableURI]: {
    _Service: (_: never) => Service
  }

  readonly scopedRef: ScopedRef<Service>

  readonly reload: Effect<never, unknown, void>

  /**
   * Retrieves the current version of the reloadable service.
   */
  get get(): Effect<never, never, Service>

  /**
   * Forks the reload of the service in the background, ignoring any errors.
   */
  get reloadFork(): Effect<never, never, void>
}

/**
 * @tsplus type effect/core/io/Reloadable.Ops
 */
export interface ReloadableOps {}
export const Reloadable: ReloadableOps = {}
