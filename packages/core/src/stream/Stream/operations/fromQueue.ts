import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a `Queue` of values.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromQueue
 * @category conversions
 * @since 1.0.0
 */
export function fromQueue<A>(
  queue: Dequeue<A>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Stream<never, never, A> {
  return Stream.repeatEffectChunkOption(
    (queue as Queue<A>)
      .takeBetween(1, maxChunkSize)
      .map(Chunk.fromIterable)
      .catchAllCause((cause) =>
        queue.isShutdown && cause.isInterrupted ? Pull.end : Pull.failCause(cause)
      )
  )
}
