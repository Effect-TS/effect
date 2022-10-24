/**
 * Creates a bounded queue with the back pressure strategy. The queue will
 * retain values until they have been taken, applying back pressure to
 * offerors if the queue is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/stm/TQueue.Ops bounded
 * @category constructors
 * @since 1.0.0
 */
export function bounded<A>(
  requestedCapacity: number
): USTM<TQueue<A>> {
  return TQueue.make(requestedCapacity, TQueue.BackPressure)
}
