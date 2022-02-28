import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @tsplus fluent ets/XPure zipWith
 */
export function zipWith_<W, W1, S1, S2, R, E, A, S3, R1, E1, B, C>(
  self: XPure<W, S1, S2, R, E, A>,
  that: LazyArg<XPure<W1, S2, S3, R1, E1, B>>,
  f: (a: A, b: B) => C
) {
  return self.flatMap((a) => that().map((b) => f(a, b)))
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<W, S2, S3, R1, E1, A, B, C>(
  that: LazyArg<XPure<W, S2, S3, R1, E1, B>>,
  f: (a: A, b: B) => C
) {
  return <W1, S1, R, E>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E1 | E, C> => self.zipWith(that, f)
}
