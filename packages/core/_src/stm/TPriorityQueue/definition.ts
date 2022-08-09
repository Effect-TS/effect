export const TPriorityQueueSym = Symbol.for("@effect/core/stm/TPriorityQueue")
export type TPriorityQueueSym = typeof TPriorityQueueSym

export const _A = Symbol.for("@effect/core/stm/TPriorityQueue/A")
export type _A = typeof _A

/**
 * A `TPriorityQueue` contains values of type `A` that an `Ordering` is defined
 * on. Unlike a `TQueue`, `take` returns the highest priority value (the value
 * that is first in the specified ordering) as opposed to the first value
 * offered to the queue. The ordering that elements with the same priority will
 * be taken from the queue is not guaranteed.
 *
 * @tsplus type effect/core/stm/TPriorityQueue
 */
export interface TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TPriorityQueue.Ops
 */
export interface TPriorityQueueOps {
  $: TPriorityQueueAspects
}
export const TPriorityQueue: TPriorityQueueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TPriorityQueue.Aspects
 */
export interface TPriorityQueueAspects {}
