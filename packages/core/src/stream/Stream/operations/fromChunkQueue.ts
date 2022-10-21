/**
 * Creates a stream from a queue of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkQueue
 */
export function fromChunkQueue<A>(
  queue: Dequeue<Chunk<A>>
): Stream<never, never, A> {
  return Stream.repeatEffectChunkMaybe(
    queue.take.catchAllCause((cause) =>
      queue.isShutdown.flatMap((isShutdown) =>
        isShutdown && cause.isInterrupted ? Pull.end : Pull.failCause(cause)
      )
    )
  )
}
