import { STMProvide } from "@effect/core/stm/STM/definition/primitives"
import type { Context } from "@fp-ts/data/Context"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stm/STM provideSomeEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideSomeEnvironment<R0, R>(f: (context: Context<R0>) => Context<R>) {
  return <E, A>(self: STM<R, E, A>): STM<R0, E, A> => new STMProvide(self, f)
}
