/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @tsplus fluent ets/XPure contramapInput
 */
export function contramapInput_<W, S0, S1, S2, R, E, A>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (s: S0) => S1
): XPure<unknown, S0, S2, R, E, A> {
  return XPure.update(f).flatMap(() => self);
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @tsplus static ets/XPure/Aspects contramapInput
 */
export const contramapInput = Pipeable(contramapInput_);
