import { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export const provide_ = <S, E, A, R = unknown, R0 = unknown>(
  r: R,
  next: Effect<S, R & R0, E, A>
): Effect<S, R0, E, A> => provideSome_(next, (r0: R0) => ({ ...r, ...r0 }))

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export const provide = <R = unknown>(r: R) => <S, E, A, R0 = unknown>(
  next: Effect<S, R & R0, E, A>
): Effect<S, R0, E, A> => provideSome_(next, (r0: R0) => ({ ...r, ...r0 }))
