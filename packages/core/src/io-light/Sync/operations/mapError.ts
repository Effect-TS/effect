import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @tsplus fluent ets/Sync mapError
 */
export function mapError_<R, E, A, E1>(
  self: Sync<R, E, A>,
  f: (e: E) => E1
): Sync<R, E1, A> {
  concreteXPure(self)
  return self.mapError(f)
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Sync<R, E, A>): Sync<R, E1, A> => self.mapError(f)
}
