import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and returning
 * the result of this computation.
 *
 * @tsplus operator ets/Sync <
 * @tsplus fluent ets/Sync zipLeft
 */
export function zipLeft_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>
): Sync<R & R1, E | E1, A> {
  concreteXPure(self)
  return self.zipLeft(that)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and returning
 * the result of this computation.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R1, E1, B>(that: LazyArg<Sync<R1, E1, B>>) {
  return <R, E, A>(self: Sync<R, E, A>): Sync<R & R1, E1 | E, A> => self.zipLeft(that)
}
