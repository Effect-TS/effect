import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"
import { Provide } from "../definition"

/**
 * Provides this computation with its required environment.
 *
 * @tsplus fluent ets/XPure provideEnvironment
 */
export function provideEnvironment_<W, S1, S2, R, E, A>(
  self: XPure<W, S1, S2, R, E, A>,
  r: LazyArg<R>
): XPure<W, S1, S2, unknown, E, A> {
  return new Provide(self, r)
}

/**
 * Provides this computation with its required environment.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(r: LazyArg<R>) {
  return <W, S1, S2, E, A>(
    self: XPure<W, S1, S2, R, E, A>
  ): XPure<W, S1, S2, unknown, E, A> => self.provideEnvironment(r)
}
