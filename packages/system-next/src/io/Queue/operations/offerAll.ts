import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
 * the queue and always returns true. If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room
 * in the queue.
 *
 * For Unbounded Queue: Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
 * it places the values otherwise it removes the old elements and enqueues the
 * new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
 * queue but if there is no room it will not enqueue them and return false.
 *
 * @tsplus fluent ets/Queue offerAll
 * @tsplus fluent ets/XQueue offerAll
 * @tsplus fluent ets/Dequeue offerAll
 * @tsplus fluent ets/XDequeue offerAll
 * @tsplus fluent ets/Enqueue offerAll
 * @tsplus fluent ets/XEnqueue offerAll
 */
export function offerAll_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  as: Iterable<A>,
  __etsTrace?: string
): Effect<RA, EA, boolean> {
  concreteQueue(self)
  return self._offerAll(as)
}

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
 * the queue and always returns true. If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room
 * in the queue.
 *
 * For Unbounded Queue: Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
 * it places the values otherwise it removes the old elements and enqueues the
 * new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
 * queue but if there is no room it will not enqueue them and return false.
 *
 * @ets_data_first offerAll_
 */
export function offerAll<A>(as: Iterable<A>, __etsTrace?: string) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RA, EA, boolean> => self.offerAll(as)
}
