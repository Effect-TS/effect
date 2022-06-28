/**
 * Creates a bounded queue with the dropping strategy. The queue will drop new
 * values if the queue is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/stm/TQueue.Ops dropping
 */
export function dropping<A>(
  requestedCapacity: number
): USTM<TQueue<A>> {
  return TQueue.make(requestedCapacity, TQueue.Dropping)
}
