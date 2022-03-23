import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { XQueue } from "../../../io/Queue"
import { Stream } from "../definition"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once
 * the stream is closed.
 *
 * @tsplus static ets/StreamOps fromChunkQueueWithShutdown
 */
export function fromChunkQueueWithShutdown<R, E, A>(
  queue: LazyArg<XQueue<never, R, unknown, E, never, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.succeed(queue).flatMap((queue) =>
    Stream.fromChunkQueue(queue).ensuring(queue.shutdown())
  )
}
