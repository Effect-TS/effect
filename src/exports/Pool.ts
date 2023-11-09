import type { PoolTypeId } from "../Pool.js"
import type { Data } from "./Data.js"
import type { Effect } from "./Effect.js"
import type { Pipeable } from "./Pipeable.js"
import type { Scope } from "./Scope.js"

export * from "../internal/Jumpers/Pool.js"
export * from "../Pool.js"

export declare namespace Pool {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Pool.js"
}
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
  get(): Effect<Scope, E, A>

  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  invalidate(item: A): Effect<never, never, void>
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
