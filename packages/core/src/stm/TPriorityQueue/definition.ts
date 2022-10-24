/**
 * @category symbol
 * @since 1.0.0
 */
export const TPriorityQueueSym = Symbol.for("@effect/core/stm/TPriorityQueue")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TPriorityQueueSym = typeof TPriorityQueueSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TPriorityQueue/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A `TPriorityQueue` contains values of type `A` that an `Ordering` is defined
 * on. Unlike a `TQueue`, `take` returns the highest priority value (the value
 * that is first in the specified ordering) as opposed to the first value
 * offered to the queue. The ordering that elements with the same priority will
 * be taken from the queue is not guaranteed.
 *
 * @tsplus type effect/core/stm/TPriorityQueue
 * @category model
 * @since 1.0.0
 */
export interface TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TPriorityQueue.Ops
 * @category model
 * @since 1.0.0
 */
export interface TPriorityQueueOps {
  $: TPriorityQueueAspects
}
export const TPriorityQueue: TPriorityQueueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TPriorityQueue.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TPriorityQueueAspects {}
