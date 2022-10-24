/**
 * Creates a bounded queue with the sliding strategy. The queue will add new
 * values and drop old values if the queue is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/stm/TQueue.Ops sliding
 * @category constructors
 * @since 1.0.0
 */
export function sliding<A>(
  requestedCapacity: number
): USTM<TQueue<A>> {
  return TQueue.make(requestedCapacity, TQueue.Sliding)
}
