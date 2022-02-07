// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as ZipAllWithExec from "./zipAllWithExec.js"

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith_<R, R1, E, E1, A, A1, A2, A3, A4>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  left: (a: A) => A2,
  right: (a1: A1) => A3,
  both: (a: A, a1: A1) => A4
): C.Stream<R & R1, E | E1, A2 | A3 | A4> {
  return ZipAllWithExec.zipAllWithExec_(self, that, T.parallel, left, right, both)
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
export function zipAllWith<R1, E1, A, A1, A2, A3, A4>(
  that: C.Stream<R1, E1, A1>,
  left: (a: A) => A2,
  right: (a1: A1) => A3,
  both: (a: A, a1: A1) => A4
) {
  return <R, E>(self: C.Stream<R, E, A>) => zipAllWith_(self, that, left, right, both)
}
