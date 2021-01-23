import { accessM, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R0, R, E, A>(effect: Effect<R, E, A>, f: (r0: R0) => R) {
  return accessM((r0: R0) => provideAll_(effect, f(r0)))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome<R0, R>(f: (r0: R0) => R) {
  return <E, A>(effect: Effect<R, E, A>) =>
    accessM((r0: R0) => provideAll_(effect, f(r0)))
}
