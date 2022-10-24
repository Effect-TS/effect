import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once
 * the stream is closed.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkQueueWithShutdown
 * @category conversions
 * @since 1.0.0
 */
export function fromChunkQueueWithShutdown<R, E, A>(queue: Dequeue<Chunk<A>>): Stream<R, E, A> {
  return Stream.fromChunkQueue(queue).ensuring(queue.shutdown)
}
