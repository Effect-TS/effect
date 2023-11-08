import type { TRef } from "./TRef.js"
import type { TSemaphoreTypeId } from "./TSemaphore.impl.js"

export * from "./internal/Jumpers/TSemaphore.js"
export * from "./TSemaphore.impl.js"

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
  export type * from "./TSemaphore.impl.js"
}
