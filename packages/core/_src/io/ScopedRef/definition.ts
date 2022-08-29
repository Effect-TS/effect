export const ScopedRefURI = Symbol.for("@effect/core/io/ScopedRef")
export type ScopedRefURI = typeof ScopedRefURI

/**
 * A `ScopedRef` is a reference whose value is associated with resources,
 * which must be released properly. You can both get the current value of any
 * `ScopedRef`, as well as set it to a new value (which may require new
 * resources). The reference itself takes care of properly releasing resources
 * for the old value whenever a new value is obtained.
 *
 * @tsplus type effect/core/io/ScopedRef
 */
export interface ScopedRef<A> {
  readonly [ScopedRefURI]: {
    _A: (_: never) => A
  }

  /**
   * Retrieves the current value of the reference.
   */
  get get(): Effect<never, never, A>

  /**
   * Sets the value of this reference to the specified resourcefully-created
   * value. Any resources associated with the old value will be released.
   *
   * This method will not return until either the reference is successfully
   * changed to the new value, with old resources released, or until the attempt
   * to acquire a new value fails.
   */
  set<R, E>(this: this, acquire: Effect<R | Scope, E, A>): Effect<R, E, void>

  /**
   * The same as `ScopedRef.set`, but performs the set asynchronously,
   * ignoring failures.
   */
  setAsync<R, E>(this: this, acquire: Effect<R | Scope, E, A>): Effect<R, E, void>
}

/**
 * @tsplus type effect/core/io/ScopedRef.Ops
 */
export interface ScopedRefOps {}
export const ScopedRef: ScopedRefOps = {}
