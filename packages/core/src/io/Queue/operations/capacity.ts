import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Retrieves the number elements the queue can hold.
 *
 * @tsplus fluent ets/Queue capacity
 * @tsplus fluent ets/XQueue capacity
 * @tsplus fluent ets/Dequeue capacity
 * @tsplus fluent ets/XDequeue capacity
 * @tsplus fluent ets/Enqueue capacity
 * @tsplus fluent ets/XEnqueue capacity
 */
export function capacity<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
): number {
  concreteQueue(self)
  return self._capacity
}
