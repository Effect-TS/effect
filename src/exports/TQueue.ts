import type { TDequeue, TDequeueTypeId, TEnqueue, TEnqueueTypeId } from "../TQueue.js"

export * from "../internal/Jumpers/TQueue.js"
export * from "../TQueue.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface TQueue<A> extends TEnqueue<A>, TDequeue<A> {}

/**
 * @since 2.0.0
 */
export declare namespace TQueue {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface TEnqueueVariance<A> {
    readonly [TEnqueueTypeId]: {
      readonly _In: (_: A) => void
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface TDequeueVariance<A> {
    readonly [TDequeueTypeId]: {
      readonly _Out: (_: never) => A
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../TQueue.js"
}
