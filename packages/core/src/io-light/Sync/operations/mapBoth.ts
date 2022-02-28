import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @tsplus fluent ets/Sync mapBoth
 */
export function mapBoth_<R, E, A, E1, A1>(
  self: Sync<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
): Sync<R, E1, A1> {
  concreteXPure(self)
  return self.mapBoth(f, g)
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @ets_data_first mapBoth_
 */
export function mapBoth<E, A, E1, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Sync<R, E, A>): Sync<R, E1, A1> => self.mapBoth(f, g)
}
