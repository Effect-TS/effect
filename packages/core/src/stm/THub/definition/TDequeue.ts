/**
 * @category symbol
 * @since 1.0.0
 */
export const TDequeueSym = Symbol.for("@effect/core/stm/THub/TDequeue")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TDequeueSym = typeof TDequeueSym

/**
 * A transactional queue that can only be dequeued.
 *
 * @tsplus type effect/core/stm/THub/TDequeue
 * @category model
 * @since 1.0.0
 */
export interface TDequeue<A> {}

/**
 * @tsplus type effect/core/stm/THub/TDequeue.Ops
 * @category model
 * @since 1.0.0
 */
export interface TDequeueOps {
  $: TDequeueAspects
}
export const TDequeueOps: TDequeueOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/THub/TDequeue.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TDequeueAspects {}
