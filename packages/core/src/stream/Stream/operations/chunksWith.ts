import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Performs the specified stream transformation with the chunk structure of
 * the stream exposed.
 *
 * @tsplus static effect/core/stream/Stream.Aspects chunksWith
 * @tsplus pipeable effect/core/stream/Stream chunksWith
 * @category mutations
 * @since 1.0.0
 */
export function chunksWith<R, E, A, R1, E1, A1>(
  f: (stream: Stream<R, E, Chunk<A>>) => Stream<R1, E1, Chunk<A1>>
) {
  return (self: Stream<R, E, A>): Stream<R | R1, E | E1, A1> =>
    Stream.suspend(f(self.chunks).unchunks)
}
