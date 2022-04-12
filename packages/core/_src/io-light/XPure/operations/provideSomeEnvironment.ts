/**
 * Transforms the initial state of this computation with the specified
 * function.
 *
 * @tsplus fluent ets/XPure provideSomeEnvironment
 */
export function provideSomeEnvironment_<W, S1, S2, R0, R1, E, A>(
  self: XPure<W, S1, S2, R1, E, A>,
  f: (r: Env<R0>) => Env<R1>
) {
  return XPure.environmentWithXPure((env: Env<R0>) => self.provideEnvironment(f(env)));
}

/**
 * Transforms the initial state of this computation with the specified
 * function.
 *
 * @tsplus static ets/XPure/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
