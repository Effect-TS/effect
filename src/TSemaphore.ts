/**
 * @since 2.0.0
 */
import type { TSemaphoreTypeId } from "./impl/TSemaphore.js"
import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 */
export * from "./impl/TSemaphore.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/TSemaphore.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface TSemaphore extends TSemaphore.Proto {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TSemaphore {
  /** @internal */
  readonly permits: TRef<number>
}

/**
 * @since 2.0.0
 */
export declare namespace TSemaphore {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [TSemaphoreTypeId]: TSemaphoreTypeId
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TSemaphore.js"
}
