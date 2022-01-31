// ets_tracing: off

import { currentTime } from "../Clock/index.js"
import type { Effect } from "./effect.js"
import { summarized_ } from "./summarized.js"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  msTime: Effect<R2, E2, number>,
  __trace?: string
) {
  return summarized_(self, msTime, (start, end) => end - start, __trace)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @ets_data_first timedWith_
 */
export function timedWith<R2, E2>(msTime: Effect<R2, E2, number>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => timedWith_(self, msTime, __trace)
}

/**
 * Returns a new effect that executes this one and times the execution.
 */
export function timed<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return timedWith_(self, currentTime, __trace)
}
