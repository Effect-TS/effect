import type { Chunk } from "../../../collection/immutable/Chunk"
import { Stream } from "../definition"

/**
 * Creates a stream from an arbitrary number of chunks.
 *
 * @tsplus static ets/StreamOps fromChunks
 */
export function fromChunks<A>(...chunks: Array<Chunk<A>>): Stream<unknown, never, A> {
  return Stream.fromIterable(chunks).flatMap((chunk) => Stream.fromChunk(chunk))
}
