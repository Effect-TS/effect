import { currentTime } from "../Clock"
import type { Effect } from "./effect"
import { summarized_ } from "./summarized"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith_<S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  msTime: Effect<S2, R2, E2, number>
) {
  return summarized_(self, msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith<S2, R2, E2>(msTime: Effect<S2, R2, E2, number>) {
  return <S, R, E, A>(self: Effect<S, R, E, A>) => timedWith_(self, msTime)
}

/**
 * Returns a new effect that executes this one and times the execution.
 */
export function timed<S, R, E, A>(self: Effect<S, R, E, A>) {
  return timedWith_(self, currentTime)
}
