import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

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
  concreteXPure(self);
  return self.orElseEither(that);
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @tsplus static ets/Sync/Aspects orElseEither
 */
export const orElseEither = Pipeable(orElseEither_);
