// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { crossWith_ } from "./crossWith.js"
import type { Stream } from "./definitions.js"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream#zip` for the more common point-wise variant.
 */
export function cross_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
): Stream<R & R1, E | E1, Tp.Tuple<[O, O2]>> {
  return crossWith_(self, that, Tp.tuple)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream#zip` for the more common point-wise variant.
 *
 * @ets_data_first cross_
 */
export function cross<R1, E1, O2>(that: Stream<R1, E1, O2>) {
  return <R, E, O>(self: Stream<R, E, O>) => cross_(self, that)
}
