import type { DeferredTypeId } from "./Deferred.impl.js"
import type { FiberId } from "./FiberId.js"
import type * as internal from "./internal/deferred.js"
import type { MutableRef } from "./MutableRef.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./Deferred.impl.js"
export * from "./internal/Jumpers/Deferred.js"

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `Deferred.await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @since 2.0.0
 * @category models
 */
export interface Deferred<E, A> extends Deferred.Variance<E, A>, Pipeable {
  /** @internal */
  readonly state: MutableRef<internal.State<E, A>>
  /** @internal */
  readonly blockingOn: FiberId
}

/**
 * @since 2.0.0
 */
export declare namespace Deferred {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [DeferredTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Deferred.impl.js"
}
