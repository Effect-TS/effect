import type { Option } from "../../../data/Option"
import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Take the head option of values in the queue.
 *
 * @tsplus fluent ets/Queue poll
 * @tsplus fluent ets/XQueue poll
 * @tsplus fluent ets/Dequeue poll
 * @tsplus fluent ets/XDequeue poll
 * @tsplus fluent ets/Enqueue poll
 * @tsplus fluent ets/XEnqueue poll
 */
export function poll<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
): Effect<RB, EB, Option<B>> {
  concreteQueue(self)
  return self._takeUpTo(1).map((chunk) => chunk.head)
}
