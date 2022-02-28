import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @tsplus fluent ets/Sync tap
 */
export function tap_<R, E, A, R1, E1, X>(
  self: Sync<R, E, A>,
  f: (a: A) => Sync<R1, E1, X>
): Sync<R & R1, E | E1, A> {
  concreteXPure(self)
  return self.tap(f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @ets_data_first tap_
 */
export function tap<A, R1, E1, X>(f: (a: A) => Sync<R1, E1, X>) {
  return <R, E>(self: Sync<R, E, A>): Sync<R & R1, E1 | E, A> => self.tap(f)
}
