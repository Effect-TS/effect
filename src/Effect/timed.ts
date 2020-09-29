import { currentTime } from "../Clock"
import type { Effect } from "./effect"
import { summarized_ } from "./summarized"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  msTime: Effect<R2, E2, number>
) {
  return summarized_(self, msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith<R2, E2>(msTime: Effect<R2, E2, number>) {
  return <R, E, A>(self: Effect<R, E, A>) => timedWith_(self, msTime)
}

/**
 * Returns a new effect that executes this one and times the execution.
 */
export function timed<R, E, A>(self: Effect<R, E, A>) {
  return timedWith_(self, currentTime)
}
