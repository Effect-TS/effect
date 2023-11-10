/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { ReloadableTypeId } from "./impl/Reloadable.js"
import type { ScopedRef } from "./ScopedRef.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Reloadable.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Reloadable.js"

/**
 * @since 2.0.0
 */
export declare namespace Reloadable {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Reloadable.js"
}
/**
 * A `Reloadable` is an implementation of some service that can be dynamically
 * reloaded, or swapped out for another implementation on-the-fly.
 *
 * @since 2.0.0
 * @category models
 */
export interface Reloadable<A> extends Reloadable.Variance<A> {
  /**
   * @internal
   */
  readonly scopedRef: ScopedRef<A>
  /**
   * @internal
   */
  reload(): Effect<never, unknown, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Reloadable {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [ReloadableTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
