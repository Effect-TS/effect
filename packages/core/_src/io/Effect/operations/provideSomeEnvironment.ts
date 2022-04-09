/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus fluent ets/Effect provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Effect<R, E, A>,
  f: (r0: R0) => R,
  __tsplusTrace?: string
): Effect<R0, E, A> {
  return Effect.environmentWithEffect((r0: R0) => self.provideEnvironment(f(r0)));
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static ets/Effect/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
