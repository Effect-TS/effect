/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus fluent ets/STM provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: STM<R, E, A>,
  env: LazyArg<Env<R>>
): STM<unknown, E, A> {
  return self.provideSomeEnvironment(env);
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus static ets/STM/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
