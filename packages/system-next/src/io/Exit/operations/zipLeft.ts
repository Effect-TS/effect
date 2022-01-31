import { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 */
export function zipLeft_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, A> {
  return zipWith_(self, that, (a, _) => a, Cause.then)
}

/**
 * Sequentially zips the this result with the specified result discarding
 * the second element of the tuple or else returns the failed `Cause`.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, A> => zipLeft_(self, that)
}
