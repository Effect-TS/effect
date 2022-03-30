import { Effect } from "../../../io/Effect"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
import type { Stream } from "../../Stream"
import type { Take } from "../../Take"

/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueueSliding
 */
export function toQueueSliding_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Dequeue<Take<E, A>>> {
  return Effect.acquireRelease(
    Queue.sliding<Take<E, A>>(capacity),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueScoped(queue).fork())
}

/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 */
export const toQueueSliding = Pipeable(toQueueSliding_)
