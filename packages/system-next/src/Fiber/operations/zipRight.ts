import type { Fiber } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Same as `zip` but discards the output of the left hand side.
 */
export function zipRight_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, A1> {
  return zipWith_(self, that, (_, b) => b)
}

/**
 * Same as `zip` but discards the output of the left hand side.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<E1, A1>(that: Fiber<E1, A1>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, A1> => zipRight_(self, that)
}
