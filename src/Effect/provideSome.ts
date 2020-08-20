import { accessM, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export const provideSome_ = <R0, S, R, E, A>(
  effect: Effect<S, R, E, A>,
  f: (r0: R0) => R
) => accessM((r0: R0) => provideAll_(effect, f(r0)))

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export const provideSome = <R0, R>(f: (r0: R0) => R) => <S, E, A>(
  effect: Effect<S, R, E, A>
) => accessM((r0: R0) => provideAll_(effect, f(r0)))
