// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Stream } from "./definitions.js"
import { zipAllWith_ } from "./zipAllWith.js"

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAll_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  defaultLeft: O,
  defaultRight: O2
): Stream<R & R1, E | E1, Tp.Tuple<[O, O2]>> {
  return zipAllWith_(
    self,
    that,
    (_) => Tp.tuple(_, defaultRight),
    (_) => Tp.tuple(defaultLeft, _),
    Tp.tuple
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
export function zipAll<R1, E1, O, O2>(
  that: Stream<R1, E1, O2>,
  defaultLeft: O,
  defaultRight: O2
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E | E1, Tp.Tuple<[O, O2]>> {
  return (self) => zipAll_(self, that, defaultLeft, defaultRight)
}
