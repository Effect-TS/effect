import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Managed } from "../../../io/Managed"
import type { XEnqueue } from "../../../io/Queue"
import { Sink } from "../definition"

/**
 * Create a sink which enqueues each element into the specified queue. The
 * queue will be shutdown once the stream is closed.
 *
 * @tsplus static ets/SinkOps fromQueueWithShutdown
 */
export function fromQueueWithShutdown<R, E, In>(
  queue: LazyArg<XEnqueue<R, E, In>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.unwrapManaged(
    Managed.acquireReleaseWith(Effect.succeed(queue), (queue) => queue.shutdown()).map(
      (queue) => Sink.fromQueue(queue)
    )
  )
}
