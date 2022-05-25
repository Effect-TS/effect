import { STMProvide } from "@effect/core/stm/STM/definition/primitives"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus fluent ets/STM provideSomeEnvironment
 */
export function provideSomeEnvironment_<R, E, A, R0>(
  self: STM<R, E, A>,
  f: (env: Env<R0>) => Env<R>
): STM<R0, E, A> {
  return new STMProvide(self, f)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static ets/STM/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_)
