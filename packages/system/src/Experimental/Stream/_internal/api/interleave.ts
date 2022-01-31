// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as Forever from "./forever.js"
import * as FromChunk from "./fromChunk.js"
import * as InterleaveWith from "./interleaveWith.js"

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A | A1> {
  return InterleaveWith.interleaveWith_(
    self,
    that,
    Forever.forever(FromChunk.fromChunk(CK.from([true, false])))
  )
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 *
 * @ets_data_first interleave_
 */
export function interleave<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => interleave_(self, that)
}
