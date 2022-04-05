/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @tsplus static ets/Stream/Ops fromChunks
 */
export function fromChunks<A>(...chunks: Array<Chunk<A>>): Stream<unknown, never, A> {
  return Stream.fromCollection(chunks).flatMap((chunk) => Stream.fromChunk(chunk));
}
