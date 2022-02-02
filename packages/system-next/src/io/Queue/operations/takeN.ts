import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @tsplus fluent ets/Queue takeN
 * @tsplus fluent ets/XQueue takeN
 * @tsplus fluent ets/Dequeue takeN
 * @tsplus fluent ets/XDequeue takeN
 * @tsplus fluent ets/Enqueue takeN
 * @tsplus fluent ets/XEnqueue takeN
 */
export function takeN_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number,
  __etsTrace?: string
): Effect<RB, EB, Chunk<B>> {
  return self.takeBetween(n, n)
}

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @ets_data_first takeN_
 */
export function takeN(n: number, __etsTrace?: string) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RB, EB, Chunk<B>> => self.takeN(n)
}
