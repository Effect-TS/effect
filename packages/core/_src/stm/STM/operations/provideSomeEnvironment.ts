import { STMProvide } from "@effect/core/stm/STM/definition/primitives"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stm/STM provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: (env: Env<R0>) => Env<R>) {
  return <E, A>(self: STM<R, E, A>): STM<R0, E, A> => new STMProvide(self, f)
}
