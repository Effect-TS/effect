import * as Tp from "../../Collections/Immutable/Tuple"
import type { Fiber } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 */
export function zip_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, Tp.Tuple<[A, A1]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 *
 * @ets_data_first zip_
 */
export function zip<E1, A1>(that: Fiber<E1, A1>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, Tp.Tuple<[A, A1]>> => zip_(self, that)
}
