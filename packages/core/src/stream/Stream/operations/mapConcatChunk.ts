import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Stream } from "../definition"

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 *
 * @tsplus fluent ets/Stream mapConcatChunk
 */
export function mapConcatChunk_<R, E, A, A2>(
  self: Stream<R, E, A>,
  f: (a: A) => Chunk<A2>,
  __tsplusTrace?: string
): Stream<R, E, A2> {
  return self.mapChunks((chunk) => chunk.flatMap(f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export const mapConcatChunk = Pipeable(mapConcatChunk_)
