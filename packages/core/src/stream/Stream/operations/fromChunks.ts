import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunks
 * @category constructors
 * @since 1.0.0
 */
export function fromChunks<A>(...chunks: Array<Chunk<A>>): Stream<never, never, A> {
  return Stream.fromIterable(chunks).flatMap((chunk) => Stream.fromChunk(chunk))
}
