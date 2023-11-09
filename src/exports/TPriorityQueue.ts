import type { TPriorityQueueTypeId } from "../TPriorityQueue.js"
import type { SortedMap } from "./SortedMap.js"
import type { TRef } from "./TRef.js"

export * from "../internal/Jumpers/TPriorityQueue.js"
export * from "../TPriorityQueue.js"

/**
 * A `TPriorityQueue` contains values of type `A` that an `Order` is defined
 * on. Unlike a `TQueue`, `take` returns the highest priority value (the value
 * that is first in the specified ordering) as opposed to the first value
 * offered to the queue. The ordering that elements with the same priority will
 * be taken from the queue is not guaranteed.
 *
 * @since 2.0.0
 * @category models
 */
export interface TPriorityQueue<A> extends TPriorityQueue.Variance<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TPriorityQueue<A> {
  /** @internal */
  readonly ref: TRef<SortedMap<A, [A, ...Array<A>]>>
}

/**
 * @since 2.0.0
 */
export declare namespace TPriorityQueue {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TPriorityQueueTypeId]: {
      readonly _A: (_: never) => A
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../TPriorityQueue.js"
}
