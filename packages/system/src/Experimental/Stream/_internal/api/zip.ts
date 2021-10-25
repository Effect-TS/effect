// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import type * as C from "../core"
import * as ZipWith from "./zipWith"

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 */
export function zip_<R, E, A, R1, E1, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R1 & R, E | E1, Tp.Tuple<[A, A1]>> {
  return ZipWith.zipWith_(self, that, Tp.tuple)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zip_
 */
export function zip<R1, E1, A1>(
  that: C.Stream<R1, E1, A1>
): <R, E, A>(self: C.Stream<R, E, A>) => C.Stream<R1 & R, E | E1, Tp.Tuple<[A, A1]>> {
  return (self) => zip_(self, that)
}
