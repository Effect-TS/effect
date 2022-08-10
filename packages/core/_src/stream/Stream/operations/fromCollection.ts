/**
 * Creates a stream from an Collection collection of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromCollection
 */
export function fromCollection<A>(as: Collection<A>): Stream<never, never, A> {
  return Stream.fromChunk(Chunk.from(as))
}
