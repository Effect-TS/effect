/**
 * Creates a stream from a queue of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunkQueue
 */
export function fromChunkQueue<A>(
  queue: LazyArg<Dequeue<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return Stream.repeatEffectChunkMaybe(() => {
    const queue0 = queue()
    return queue0.take.catchAllCause((cause) =>
      queue0.isShutdown.flatMap((isShutdown) => isShutdown && cause.isInterrupted ? Pull.end : Pull.failCause(cause))
    )
  })
}
