import type { Effect } from "../definition"
import { environmentWithEffect } from "./environmentWithEffect"
import { provideEnvironment_ } from "./provideEnvironment"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets fluent ets/Effect provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  effect: Effect<R, E, A>,
  f: (r0: R0) => R,
  __trace?: string
): Effect<R0, E, A> {
  return environmentWithEffect((r0: R0) => provideEnvironment_(effect, f(r0)), __trace)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R0, R>(f: (r0: R0) => R, __trace?: string) {
  return <E, A>(effect: Effect<R, E, A>): Effect<R0, E, A> =>
    provideSomeEnvironment_(effect, f, __trace)
}
