import { zipLeftChunks } from "@effect/core/stream/Stream/operations/_internal/zipLeftChunks"

/**
 * Zips this stream with another point-wise, but keeps only the outputs of
 * this stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipLeft
 * @tsplus pipeable effect/core/stream/Stream zipLeft
 */
export function zipLeft<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.zipWithChunks(
      that,
      zipLeftChunks
    )
}
