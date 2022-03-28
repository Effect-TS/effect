import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../definition"
import { zipChunks } from "./_internal/zipChunks"

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus fluent ets/Stream zipWith
 */
export function zipWith_<R, E, A, R2, E2, A2, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  f: (a: A, a2: A2) => A3,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return self.zipWithChunks(that, (leftChunk, rightChunk) =>
    zipChunks(leftChunk, rightChunk, f)
  )
}

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export const zipWith = Pipeable(zipWith_)
