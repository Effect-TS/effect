import { accessM, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R0, S, R, E, A>(
  effect: Effect<S, R, E, A>,
  f: (r0: R0) => R
) {
  return accessM((r0: R0) => provideAll_(effect, f(r0)))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome<R0, R>(f: (r0: R0) => R) {
  return <S, E, A>(effect: Effect<S, R, E, A>) =>
    accessM((r0: R0) => provideAll_(effect, f(r0)))
}
