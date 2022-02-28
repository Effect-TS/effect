import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/Sync flatMap
 */
export function chain_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  f: (a: A) => Sync<R1, E1, B>
): Sync<R & R1, E | E1, B> {
  concreteXPure(self)
  return self.flatMap(f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain_
 */
export function chain<A, R1, E1, B>(f: (a: A) => Sync<R1, E1, B>) {
  return <R, E>(self: Sync<R, E, A>): Sync<R & R1, E1 | E, B> => self.flatMap(f)
}
