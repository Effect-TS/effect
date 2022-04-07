import { concreteXPure } from "@effect/core/io-light/Sync/definition";

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and returning
 * the result of that computation.
 *
 * @tsplus operator ets/Sync >
 * @tsplus fluent ets/Sync zipRight
 */
export function zipRight_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>
): Sync<R & R1, E | E1, B> {
  concreteXPure(self);
  return self.zipRight(that);
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and returning
 * the result of that computation.
 *
 * @tsplus static ets/Sync/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
