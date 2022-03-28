import { Tuple } from "../../../collection/immutable/Tuple"
import { Cause } from "../../Cause"
import type { Exit } from "../definition"

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus fluent ets/Exit zip
 */
export function zip_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b), Cause.then)
}

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @ets_data_first zip_
 */
export function zip<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, Tuple<[A, B]>> => self.zip(that)
}
