/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunks
 */
export function fromChunks<A>(...chunks: Array<Chunk<A>>): Stream<never, never, A> {
  return Stream.fromCollection(chunks).flatMap((chunk) => Stream.fromChunk(chunk))
}
