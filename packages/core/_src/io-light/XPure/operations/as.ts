/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/XPure as
 */
export function as_<W, S1, R, E, A, S2, B>(
  self: XPure<W, S1, S2, R, E, A>,
  value: LazyArg<B>
): XPure<W, S1, S2, R, E, B> {
  return self.map(value);
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static ets/XPure/Aspects as
 */
export const as = Pipeable(as_);
