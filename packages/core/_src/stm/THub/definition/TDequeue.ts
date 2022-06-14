export const TDequeueSym = Symbol.for("@effect/core/stm/THub/TDequeue")
export type TDequeueSym = typeof TDequeueSym

/**
 * A transactional queue that can only be dequeued.
 *
 * @tsplus type ets/THub/TDequeue
 */
export interface TDequeue<A> {}

/**
 * @tsplus type ets/THub/TDequeue/Ops
 */
export interface TDequeueOps {
  $: TDequeueAspects
}
export const TDequeueOps: TDequeueOps = {
  $: {}
}

/**
 * @tsplus type ets/THub/TDequeue/Aspects
 */
export interface TDequeueAspects {}
