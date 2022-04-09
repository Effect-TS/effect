/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/XPure catchAll
 */
export function catchAll_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => XPure<W1, S1, S3, R1, E1, B>
) {
  return self.foldXPure(failure, (a) => XPure.succeed(a));
}

/**
 * Recovers from all errors.
 *
 * @tsplus static ets/XPure/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_);
