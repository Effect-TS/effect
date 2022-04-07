import { concreteXPure } from "@effect/core/io-light/Sync/definition";

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/Sync flatMap
 */
export function flatMap_<R, E, A, R1, E1, B>(
  self: Sync<R, E, A>,
  f: (a: A) => Sync<R1, E1, B>
): Sync<R & R1, E | E1, B> {
  concreteXPure(self);
  return self.flatMap(f);
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus static ets/Sync/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_);
