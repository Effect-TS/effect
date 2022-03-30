import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Enqueue } from "../../../io/Queue"
import { Sink } from "../definition"

/**
 * Create a sink which enqueues each element into the specified queue.
 *
 * @tsplus static ets/SinkOps fromQueue
 */
export function fromQueue<R, E, In>(
  queue: LazyArg<Enqueue<In>>,
  __tsplusTrace?: string
): Sink<R, E, In, never, void> {
  return Sink.unwrap(
    Effect.succeed(queue).map((queue) =>
      Sink.forEachChunk((chunk) => queue.offerAll(chunk))
    )
  )
}
