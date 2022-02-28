import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @tsplus fluent ets/Sync zip
 */
export function zip_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>
): Sync<R & R1, E | E1, Tuple<[A, B]>> {
  concreteXPure(self)
  return self.zip(that)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @ets_data_first zip_
 */
export function zip<R1, E1, B>(that: LazyArg<Sync<R1, E1, B>>) {
  return <R, E, A>(self: Sync<R, E, A>): Sync<R & R1, E1 | E, Tuple<[A, B]>> =>
    self.zip(that)
}
