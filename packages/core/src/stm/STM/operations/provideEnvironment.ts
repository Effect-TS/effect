import type { Context } from "@fp-ts/data/Context"

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stm/STM provideEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideEnvironment<R>(context: Context<R>) {
  return <E, A>(self: STM<R, E, A>): STM<never, E, A> => self.provideSomeEnvironment(() => context)
}
