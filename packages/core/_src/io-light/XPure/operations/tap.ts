/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @tsplus fluent ets/XPure tap
 */
export function tap_<W, W1, S1, R, E, A, S2, S3, R1, E1, X>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => XPure<W1, S2, S3, R1, E1, X>
): XPure<W | W1, S1, S3, R & R1, E | E1, A> {
  return self.flatMap((a) => f(a).map(() => a));
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @tsplus static ets/XPure/Aspects tap
 */
export const tap = Pipeable(tap_);
