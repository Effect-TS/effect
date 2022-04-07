import { zipRightChunks } from "@effect/core/stream/Stream/operations/_internal/zipRightChunks";

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the
 * other stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus fluent ets/Stream zipRight
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.zipWithChunks(that, zipRightChunks);
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the
 * other stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static ets/Stream/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
