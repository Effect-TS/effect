import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Stream } from "../../Stream"

/**
 * Partitions the stream with specified chunkSize
 *
 * @param chunkSize The size of the chunks to emit.
 *
 * @tsplus fluent ets/Stream grouped
 */
export function grouped_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number,
  __tsplusTrace?: string
): Stream<R, E, Chunk<A>> {
  return self.rechunk(chunkSize).chunks()
}

/**
 * Partitions the stream with specified chunkSize
 *
 * @param chunkSize The size of the chunks to emit.
 */
export const grouped = Pipeable(grouped_)
