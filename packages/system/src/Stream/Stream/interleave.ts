import type { Stream } from "./definitions"
import { forever } from "./forever"
import { fromChunk } from "./fromChunk"
import { interleaveWith } from "./interleaveWith"

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E1 | E, O1 | O> {
  return interleaveWith(that)(forever(fromChunk([true, false])))(self)
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave<R1, E1, O1>(that: Stream<R1, E1, O1>) {
  return <R, E, O>(self: Stream<R, E, O>) => interleave_(self, that)
}
