/**
 * Creates a bounded queue with the sliding strategy. The queue will add new
 * values and drop old values if the queue is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static ets/TQueue/Ops sliding
 */
export function sliding<A>(
  requestedCapacity: number
): USTM<TQueue<A>> {
  return TQueue.make(requestedCapacity, TQueue.Sliding)
}
