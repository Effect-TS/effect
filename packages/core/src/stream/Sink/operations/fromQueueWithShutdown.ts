import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Enqueue } from "../../../io/Queue"
import { Sink } from "../definition"

/**
 * Create a sink which enqueues each element into the specified queue. The
 * queue will be shutdown once the stream is closed.
 *
 * @tsplus static ets/SinkOps fromQueueWithShutdown
 */
export function fromQueueWithShutdown<R, E, In>(
  queue: LazyArg<Enqueue<In>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.unwrapScoped(
    Effect.acquireRelease(Effect.succeed(queue), (queue) => queue.shutdown).map(
      (queue) => Sink.fromQueue(queue)
    )
  )
}
