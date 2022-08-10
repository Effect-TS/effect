import { zipChunks } from "@effect/core/stream/Stream/operations/_internal/zipChunks"

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipWith
 * @tsplus pipeable effect/core/stream/Stream zipWith
 */
export function zipWith<R2, E2, A2, A, A3>(
  that: Stream<R2, E2, A2>,
  f: (a: A, a2: A2) => A3
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    self.zipWithChunks(that, (leftChunk, rightChunk) => zipChunks(leftChunk, rightChunk, f))
}
