import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"

/**
 * Creates a stream from a `Queue` of values.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromQueue
 */
export function fromQueue<A>(
  queue: Dequeue<A>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Stream<never, never, A> {
  return Stream.repeatEffectChunkMaybe(
    (queue as Queue<A>)
      .takeBetween(1, maxChunkSize)
      .map(Chunk.from)
      .catchAllCause((cause) =>
        queue.isShutdown && cause.isInterrupted ? Pull.end : Pull.failCause(cause)
      )
  )
}
