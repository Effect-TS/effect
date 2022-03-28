import { Cause } from "../../Cause"
import type { Exit } from "../definition"

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus operator ets/Exit <
 * @tsplus fluent ets/Exit zipLeft
 */
export function zipLeft_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, A> {
  return self.zipWith(that, (a, _) => a, Cause.then)
}

/**
 * Sequentially zips the this result with the specified result discarding
 * the second element of the tuple or else returns the failed `Cause`.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, A> => self.zipLeft(that)
}
