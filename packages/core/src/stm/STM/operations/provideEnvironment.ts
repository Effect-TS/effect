import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

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
  return self.provideSomeEnvironment(r)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(r: LazyArg<R>) {
  return <E, A>(self: STM<R, E, A>): STM<unknown, E, A> => self.provideEnvironment(r)
}
