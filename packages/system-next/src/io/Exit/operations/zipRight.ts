import { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 */
export function zipRight_<E, A, E1, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, B> {
  return zipWith_(self, that, (_, b) => b, Cause.then)
}

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, B> => zipRight_(self, that)
}
