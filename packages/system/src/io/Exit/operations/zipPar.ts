import { Tuple } from "../../../collection/immutable/Tuple"
import { Cause } from "../../Cause"
import type { Exit } from "../definition"

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @tsplus fluent ets/Exit zipPar
 */
export function zipPar_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b), Cause.both)
}

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, Tuple<[A, B]>> => self.zipPar(that)
}
