import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a queue of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkQueue
 * @category conversions
 * @since 1.0.0
 */
export function fromChunkQueue<A>(
  queue: Dequeue<Chunk<A>>
): Stream<never, never, A> {
  return Stream.repeatEffectChunkOption(
    queue.take.catchAllCause((cause) =>
      queue.isShutdown.flatMap((isShutdown) =>
        isShutdown && cause.isInterrupted ? Pull.end : Pull.failCause(cause)
      )
    )
  )
}
