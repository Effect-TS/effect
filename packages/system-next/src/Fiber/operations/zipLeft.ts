// ets_tracing: off

import type { Fiber } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Same as `zip` but discards the output of the right hand side.
 */
export function zipLeft_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, A> {
  return zipWith_(self, that, (a, _) => a)
}

/**
 * Same as `zip` but discards the output of the right hand side.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<E1, A1>(that: Fiber<E1, A1>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, A> => zipLeft_(self, that)
}
