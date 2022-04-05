import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @tsplus fluent ets/Sync provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R1, E, A>(
  self: Sync<R1, E, A>,
  f: (r: R0) => R1
): Sync<R0, E, A> {
  concreteXPure(self)
  return self.provideSomeEnvironment(f)
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSome<R0, R1>(f: (r: R0) => R1) {
  return <E, A>(self: Sync<R1, E, A>): Sync<R0, E, A> => self.provideSomeEnvironment(f)
}
