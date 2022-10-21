/**
 * Creates a stream from a `TQueue` of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromTQueue
 */
export function fromTQueue<A>(queue: TQueue<A>): Stream<never, never, A> {
  return Stream.repeatEffectChunk(queue.take.map(Chunk.single).commit)
}
