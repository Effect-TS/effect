// ets_tracing: off

import type * as C from "../core.js"
import * as ZipWith from "./zipWith.js"

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R1 & R, E | E1, A> {
  return ZipWith.zipWith_(self, that, (o, _) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R, R1, E, E1, A, A1>(that: C.Stream<R1, E1, A1>) {
  return (self: C.Stream<R, E, A>) => zipLeft_(self, that)
}
