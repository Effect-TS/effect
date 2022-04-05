import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @tsplus fluent ets/Sync zip
 */
export function zip_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R1, E1, B>>
): Sync<R & R1, E | E1, Tuple<[A, B]>> {
  concreteXPure(self);
  return self.zip(that);
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @tsplus static ets/Sync/Aspects zip
 */
export const zip = Pipeable(zip_);
