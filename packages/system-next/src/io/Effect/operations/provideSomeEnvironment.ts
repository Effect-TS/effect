import { Effect } from "../definition"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets fluent ets/Effect provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Effect<R, E, A>,
  f: (r0: R0) => R,
  __etsTrace?: string
): Effect<R0, E, A> {
  return Effect.environmentWithEffect((r0: R0) => self.provideEnvironment(f(r0)))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R0, R>(f: (r0: R0) => R, __etsTrace?: string) {
  return <E, A>(self: Effect<R, E, A>): Effect<R0, E, A> =>
    provideSomeEnvironment_(self, f)
}
