import { XPure } from "../definition"

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/XPure map
 */
export function map_<W, S1, R, E, A, S2, B>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => B
): XPure<W, S1, S2, R, E, B> {
  return self.flatMap((a) => XPure.succeed(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <W, S1, S2, R, E>(
    self: XPure<W, S1, S2, R, E, A>
  ): XPure<W, S1, S2, R, E, B> => self.map(f)
}
