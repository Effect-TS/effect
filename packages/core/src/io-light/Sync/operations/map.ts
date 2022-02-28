import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/Sync map
 */
export function map_<R, E, A, B>(self: Sync<R, E, A>, f: (a: A) => B): Sync<R, E, B> {
  concreteXPure(self)
  return self.map(f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Sync<R, E, A>): Sync<R, E, B> => self.map(f)
}
