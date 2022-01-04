// ets_tracing: off

import { both } from "../../Cause"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { Exit } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 */
export function zipPar_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, Tp.Tuple<[A, B]>> {
  return zipWith_(self, that, (a, b) => Tp.tuple(a, b), both)
}

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, Tp.Tuple<[A, B]>> => zipPar_(self, that)
}
