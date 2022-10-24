import type { Order } from "@fp-ts/core/typeclass/Order"

/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(order: Order<A>) {
  return (...data: Array<A>): STM<never, never, TPriorityQueue<A>> =>
    TPriorityQueue.from(order)(data)
}
