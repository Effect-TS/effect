export const TDequeueSym = Symbol.for("@effect/core/stm/THub/TDequeue")
export type TDequeueSym = typeof TDequeueSym

/**
 * A transactional queue that can only be dequeued.
 *
 * @tsplus type effect/core/stm/THub/TDequeue
 */
export interface TDequeue<A> {}

/**
 * @tsplus type effect/core/stm/THub/TDequeue.Ops
 */
export interface TDequeueOps {
  $: TDequeueAspects
}
export const TDequeueOps: TDequeueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/THub/TDequeue.Aspects
 */
export interface TDequeueAspects {}
