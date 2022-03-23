import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { XQueue } from "../../../io/Queue"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @tsplus fluent ets/Stream runIntoQueue
 */
export function runIntoQueue_<R, E extends E1, A, R1, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<XQueue<R1, never, never, unknown, Take<E1, A>, unknown>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, void> {
  return self.runIntoQueueManaged(queue).useDiscard(Effect.unit)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 */
export const runIntoQueue = Pipeable(runIntoQueue_)
