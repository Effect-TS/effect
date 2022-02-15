import { Cause } from "../../Cause"
import type { Exit } from "../definition"

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus fluent ets/Exit zipRight
 */
export function zipRight_<E, A, E1, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, B> {
  return self.zipWith(that, (_, b) => b, Cause.then)
}

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<E1, B>(that: Exit<E1, B>) {
  return <E, A>(self: Exit<E, A>): Exit<E | E1, B> => self.zipRight(that)
}
