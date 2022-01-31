// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { forever } from "./forever.js"
import { fromChunk } from "./fromChunk.js"
import { interleaveWith_ } from "./interleaveWith.js"

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
  return interleaveWith_(self, that, forever(fromChunk(A.from([true, false]))))
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
