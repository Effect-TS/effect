import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Sync catchAll
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  f: (e: E) => Sync<R1, E1, B>
): Sync<R & R1, E1, A | B> {
  concreteXPure(self)
  return self.catchAll(f)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<S1, E, S3, R1, E1, B>(f: (e: E) => Sync<R1, E1, B>) {
  return <R, A>(self: Sync<R, E, A>): Sync<R & R1, E1, B | A> => self.catchAll(f)
}
