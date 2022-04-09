/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus fluent ets/STM provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: STM<R, E, A>,
  r: LazyArg<R>
): STM<unknown, E, A> {
  return self.provideSomeEnvironment(r);
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @tsplus static ets/STM/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
