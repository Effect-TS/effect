/**
 * A variant of `flatMap` that ignores the value produced by this computation.
 *
 * @tsplus operator ets/XPure >
 * @tsplus fluent ets/XPure zipRight
 */
export function zipRight_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  that: LazyArg<XPure<W1, S2, S3, R1, E1, B>>
): XPure<W | W1, S1, S3, R & R1, E | E1, B> {
  return self.flatMap(() => that());
}

/**
 * A variant of `flatMap` that ignores the value produced by this computation.
 *
 * @tsplus static ets/XPure/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
