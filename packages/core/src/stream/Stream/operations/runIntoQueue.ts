import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Enqueue } from "../../../io/Queue"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @tsplus fluent ets/Stream runIntoQueue
 */
export function runIntoQueue_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<Enqueue<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R, E | E1, void> {
  return Effect.scoped(self.runIntoQueueScoped(queue))
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 */
export const runIntoQueue = Pipeable(runIntoQueue_)
