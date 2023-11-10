/**
 * @since 2.0.0
 */
import type { Either } from "./Either.js"
import type { TDeferredTypeId } from "./impl/TDeferred.js"
import type { Option } from "./Option.js"
import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 */
export * from "./impl/TDeferred.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/TDeferred.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface TDeferred<E, A> extends TDeferred.Variance<E, A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TDeferred<E, A> {
  /** @internal */
  readonly ref: TRef<Option<Either<E, A>>>
}

/**
 * @since 2.0.0
 */
export declare namespace TDeferred {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [TDeferredTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TDeferred.js"
}
