/**
 * Transforms the initial state of this computation with the specified
 * function.
 *
 * @tsplus fluent ets/XPure provideSomeEnvironment
 */
export function provideSomeEnvironment_<W, S1, S2, R0, R1, E, A>(
  self: XPure<W, S1, S2, R1, E, A>,
  f: (r: R0) => R1
) {
  return XPure.environmentWithXPure((r: R0) => self.provideEnvironment(f(r)));
}

/**
 * Transforms the initial state of this computation with the specified
 * function.
 *
 * @tsplus static ets/XPure/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
