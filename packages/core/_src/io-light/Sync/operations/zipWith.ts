import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @tsplus fluent ets/Sync zipWith
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>,
  f: (a: A, b: B) => C
): Sync<R & R1, E | E1, C> {
  concreteXPure(self);
  return self.zipWith(that, f);
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @tsplus static ets/Sync/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_);
