/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @tsplus fluent ets/XPure zip
 */
export function zip_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  that: LazyArg<XPure<W1, S2, S3, R1, E1, B>>
): XPure<W | W1, S1, S3, R & R1, E | E1, Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b));
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 *
 * @tsplus static ets/XPure/Aspects zip
 */
export const zip = Pipeable(zip_);
