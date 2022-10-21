/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stm/STM provideEnvironment
 */
export function provideEnvironment<R>(env: Env<R>) {
  return <E, A>(self: STM<R, E, A>): STM<never, E, A> => self.provideSomeEnvironment(() => env)
}
