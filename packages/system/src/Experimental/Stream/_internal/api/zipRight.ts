// ets_tracing: off

import type * as C from "../core.js"
import * as ZipWith from "./zipWith.js"

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipRight_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R1 & R, E | E1, A1> {
  return ZipWith.zipWith_(self, that, (_, o) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R, R1, E, E1, A, A1>(that: C.Stream<R1, E1, A1>) {
  return (self: C.Stream<R, E, A>) => zipRight_(self, that)
}
