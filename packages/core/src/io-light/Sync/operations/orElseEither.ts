import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @tsplus fluent ets/Sync orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R2, E2, A2>>
): Sync<R & R2, E2, Either<A, A2>> {
  concreteXPure(self)
  return self.orElseEither(that)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(that: LazyArg<Sync<R2, E2, A2>>) {
  return <R, E, A>(self: Sync<R, E, A>): Sync<R & R2, E2, Either<A, A2>> =>
    self.orElseEither(that)
}
