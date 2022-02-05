// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type * as C from "../core.js"
import * as ZipAllWith from "./zipAllWith.js"

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAll_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  defaultLeft: A,
  defaultRight: A1
): C.Stream<R & R1, E | E1, Tp.Tuple<[A, A1]>> {
  return ZipAllWith.zipAllWith_(
    self,
    that,
    (_) => Tp.tuple(_, defaultRight),
    (_) => Tp.tuple(defaultLeft, _),
    (a, b) => Tp.tuple(a, b)
  )
}

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * @ets_data_first zipAll_
 */
export function zipAll<R1, E1, A, A1>(
  that: C.Stream<R1, E1, A1>,
  defaultLeft: A,
  defaultRight: A1
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    zipAll_(self, that, defaultLeft, defaultRight)
}
