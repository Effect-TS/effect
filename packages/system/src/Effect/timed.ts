import { currentTime } from "../Clock"
import type { Effect } from "./effect"
import { summarized_ } from "./summarized"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export const timedWith_ = <S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  msTime: Effect<S2, R2, E2, number>
) => summarized_(self, msTime, (start, end) => end - start)

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export const timedWith = <S2, R2, E2>(msTime: Effect<S2, R2, E2, number>) => <
  S,
  R,
  E,
  A
>(
  self: Effect<S, R, E, A>
) => timedWith_(self, msTime)

/**
 * Returns a new effect that executes this one and times the execution.
 */
export const timed = <S, R, E, A>(self: Effect<S, R, E, A>) =>
  timedWith_(self, currentTime)
