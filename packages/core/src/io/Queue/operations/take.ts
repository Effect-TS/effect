import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 *
 * @tsplus fluent ets/Queue take
 * @tsplus fluent ets/XQueue take
 * @tsplus fluent ets/Dequeue take
 * @tsplus fluent ets/XDequeue take
 * @tsplus fluent ets/Enqueue take
 * @tsplus fluent ets/XEnqueue take
 */
export function take<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): Effect<RB, EB, B> {
  concreteQueue(self)
  return self._take
}
