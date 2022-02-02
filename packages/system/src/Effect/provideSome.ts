// ets_tracing: off

import * as core from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R0, R, E, A>(
  effect: Effect<R, E, A>,
  f: (r0: R0) => R,
  __trace?: string
) {
  return core.accessM((r0: R0) => core.provideAll_(effect, f(r0)), __trace)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets_data_first provideSome_
 */
export function provideSome<R0, R>(f: (r0: R0) => R, __trace?: string) {
  return <E, A>(effect: Effect<R, E, A>) => provideSome_(effect, f, __trace)
}
