import { FlatMap } from "@effect/core/io-light/XPure/definition/primitives";

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/XPure flatMap
 */
export function flatMap_<W, W1, S1, R, E, A, S2, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => XPure<W1, S2, S3, R1, E1, B>
): XPure<W | W1, S1, S3, R & R1, E | E1, B> {
  return new FlatMap(self, f);
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus static ets/XPure/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_);
