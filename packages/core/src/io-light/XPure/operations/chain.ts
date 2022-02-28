import type { XPure } from "../definition"
import { FlatMap } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/XPure flatMap
 */
export function chain_<W, W1, S1, R, E, A, S2, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => XPure<W1, S2, S3, R1, E1, B>
): XPure<W | W1, S1, S3, R & R1, E | E1, B> {
  return new FlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain
 */
export function chain<W, A, S2, S3, R1, E1, B>(
  f: (a: A) => XPure<W, S2, S3, R1, E1, B>
) {
  return <W1, S1, R, E>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E | E1, B> => self.flatMap(f)
}
