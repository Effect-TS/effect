import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @tsplus fluent ets/Sync fold
 */
export function fold_<R, E, A, B, C>(
  self: Sync<R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => C
): Sync<R, never, B | C> {
  concreteXPure(self)
  return self.fold(failure, success)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, B, C>(failure: (e: E) => B, success: (a: A) => C) {
  return <R>(self: Sync<R, E, A>): Sync<R, never, B | C> => self.fold(failure, success)
}
