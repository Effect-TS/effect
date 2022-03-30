import { Effect } from "../../../io/Effect"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Converts the stream into an unbounded scoped queue. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueueUnbounded
 */
export function toQueueUnbounded<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Dequeue<Take<E, A>>> {
  return Effect.acquireRelease(
    Queue.unbounded<Take<E, A>>(),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueScoped(queue).fork())
}
