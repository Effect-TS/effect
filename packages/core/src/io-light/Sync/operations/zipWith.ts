import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @tsplus fluent ets/Sync zipWith
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>,
  f: (a: A, b: B) => C
): Sync<R & R1, E | E1, C> {
  concreteXPure(self)
  return self.zipWith(that, f)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<R1, E1, A, B, C>(
  that: LazyArg<Sync<R1, E1, B>>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Sync<R, E, A>): Sync<R & R1, E1 | E, C> => self.zipWith(that, f)
}
