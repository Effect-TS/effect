import type { STM } from "../definition"
import { STMProvide } from "../definition"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus fluent ets/STM provideSomeEnvironment
 */
export function provideSomeEnvironment_<R, E, A, R0>(
  self: STM<R, E, A>,
  f: (r: R0) => R
): STM<R0, E, A> {
  return new STMProvide(self, f)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R, R0>(f: (r: R0) => R) {
  return <E, A>(self: STM<R, E, A>): STM<R0, E, A> => self.provideSomeEnvironment(f)
}
