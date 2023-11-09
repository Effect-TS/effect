import type { ResourceTypeId } from "../Resource.js"
import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.js"
import type { Scope } from "./Scope.js"
import type { ScopedRef } from "./ScopedRef.js"

export * from "../internal/Jumpers/Resource.js"
export * from "../Resource.js"
export declare namespace Resource {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Resource.js"
}
/**
 * A `Resource` is a possibly resourceful value that is loaded into memory, and
 * which can be refreshed either manually or automatically.
 *
 * @since 2.0.0
 * @category models
 */
export interface Resource<E, A> extends Resource.Variance<E, A> {
  /** @internal */
  readonly scopedRef: ScopedRef<Exit<E, A>>
  /** @internal */
  acquire(): Effect<Scope, E, A>
}

/**
 * @since 2.0.0
 */
export declare namespace Resource {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [ResourceTypeId]: {
      _E: (_: never) => E
      _A: (_: never) => A
    }
  }
}
