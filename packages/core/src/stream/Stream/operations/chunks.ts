import { Chunk } from "../../../collection/immutable/Chunk"
import type { Stream } from "../definition"

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of
 * elements.
 *
 * @tsplus fluent ets/Stream chunks
 */
export function chunks<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Chunk<A>> {
  return self.mapChunks(Chunk.single)
}
