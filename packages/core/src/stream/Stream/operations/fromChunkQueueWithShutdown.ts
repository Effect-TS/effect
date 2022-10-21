/**
 * Creates a stream from a queue of values. The queue will be shutdown once
 * the stream is closed.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkQueueWithShutdown
 */
export function fromChunkQueueWithShutdown<R, E, A>(queue: Dequeue<Chunk<A>>): Stream<R, E, A> {
  return Stream.fromChunkQueue(queue).ensuring(queue.shutdown)
}
