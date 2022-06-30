/**
 * Creates a stream from a `TQueue` of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromTQueue
 */
export function fromTQueue<A>(
  queue: LazyArg<TQueue<A>>,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return Stream.repeatEffectChunk(queue().take.map(Chunk.single).commit)
}
