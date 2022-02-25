import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Removes all the values in the queue and returns the values. If the queue is
 * empty returns an empty collection.
 *
 * @tsplus fluent ets/Queue takeAll
 * @tsplus fluent ets/XQueue takeAll
 * @tsplus fluent ets/Dequeue takeAll
 * @tsplus fluent ets/XDequeue takeAll
 * @tsplus fluent ets/Enqueue takeAll
 * @tsplus fluent ets/XEnqueue takeAll
 */
export function takeAll<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): Effect<RB, EB, Chunk<B>> {
  concreteQueue(self)
  return self._takeAll
}
