import type { Effect } from "./Effect.js"
import type { KeyedPoolTypeId } from "./impl/KeyedPool.js"
import type { Pipeable } from "./Pipeable.js"
import type { Scope } from "./Scope.js"

export * from "./impl/KeyedPool.js"
export * from "./internal/Jumpers/KeyedPool.js"

export declare namespace KeyedPool {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/KeyedPool.js"
}
/**
 * A `KeyedPool<K, E, A>` is a pool of `Pool`s of items of type `A`. Each pool
 * in the `KeyedPool` is associated with a key of type `K`.
 *
 * @since 2.0.0
 * @category models
 */
export interface KeyedPool<K, E, A> extends KeyedPool.Variance<K, E, A>, Pipeable {
  /**
   * Retrieves an item from the pool belonging to the given key in a scoped
   * effect. Note that if acquisition fails, then the returned effect will fail
   * for that same reason. Retrying a failed acquisition attempt will repeat the
   * acquisition attempt.
   */
  get(key: K): Effect<Scope, E, A>

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
export declare namespace KeyedPool {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<K, E, A> {
    readonly [KeyedPoolTypeId]: {
      readonly _K: (_: K) => void
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}
