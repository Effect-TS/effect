import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Partitions the stream with specified chunkSize
 *
 * @param chunkSize The size of the chunks to emit.
 *
 * @tsplus static effect/core/stream/Stream.Aspects grouped
 * @tsplus pipeable effect/core/stream/Stream grouped
 * @category grouping
 * @since 1.0.0
 */
export function grouped(chunkSize: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, Chunk<A>> => self.rechunk(chunkSize).chunks
}
