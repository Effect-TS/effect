import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Provides this computation with its required environment.
 *
 * @tsplus fluent ets/Sync provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Sync<R, E, A>,
  r: LazyArg<R>
): Sync<unknown, E, A> {
  concreteXPure(self)
  return self.provideEnvironment(r)
}

/**
 * Provides this computation with its required environment.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(r: LazyArg<R>) {
  return <E, A>(self: Sync<R, E, A>): Sync<unknown, E, A> => self.provideEnvironment(r)
}
