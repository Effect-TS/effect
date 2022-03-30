import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Dequeue } from "../../../io/Queue"
import { Stream } from "../definition"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once
 * the stream is closed.
 *
 * @tsplus static ets/StreamOps fromChunkQueueWithShutdown
 */
export function fromChunkQueueWithShutdown<R, E, A>(
  queue: LazyArg<Dequeue<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.succeed(queue).flatMap((queue) =>
    Stream.fromChunkQueue(queue).ensuring(queue.shutdown)
  )
}
