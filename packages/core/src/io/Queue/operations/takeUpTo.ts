import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Takes up to max number of values in the queue.
 *
 * @tsplus fluent ets/Queue takeUpTo
 * @tsplus fluent ets/XQueue takeUpTo
 * @tsplus fluent ets/Dequeue takeUpTo
 * @tsplus fluent ets/XDequeue takeUpTo
 * @tsplus fluent ets/Enqueue takeUpTo
 * @tsplus fluent ets/XEnqueue takeUpTo
 */
export function takeUpTo_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number,
  __tsplusTrace?: string
): Effect<RB, EB, Chunk<B>> {
  concreteQueue(self)
  return self._takeUpTo(n)
}

/**
 * Takes up to max number of values in the queue.
 *
 * @ets_data_first takeUpTo_
 */
export function takeUpTo(n: number, __tsplusTrace?: string) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RB, EB, Chunk<B>> => self.takeUpTo(n)
}
