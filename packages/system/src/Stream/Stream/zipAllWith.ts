// ets_tracing: off

import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { zipAllWithExec_ } from "./zipAllWithExec.js"

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith_<R, R1, E, E1, O, O2, O3>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  left: (o: O) => O3,
  right: (o2: O2) => O3,
  both: (o: O, o2: O2) => O3
): Stream<R & R1, E | E1, O3> {
  return zipAllWithExec_(self, that, T.parallel, left, right, both)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * @ets_data_first zipAllWith_
 */
export function zipAllWith<R1, E1, O, O2, O3>(
  that: Stream<R1, E1, O2>,
  left: (o: O) => O3,
  right: (o2: O2) => O3,
  both: (o: O, o2: O2) => O3
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E | E1, O3> {
  return (self) => zipAllWith_(self, that, left, right, both)
}
