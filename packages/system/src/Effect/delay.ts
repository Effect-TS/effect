// ets_tracing: off

import type { HasClock } from "../Clock/index.js"
import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { sleep } from "./sleep.js"

/**
 * Delay the effect of n milliseconds
 *
 * @ets_data_first delay_
 */
export function delay(ms: number, __trace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R & HasClock, E, A> =>
    delay_(effect, ms, __trace)
}

/**
 * Delay the effect of ms milliseconds
 */
export function delay_<R, E, A>(
  effect: Effect<R, E, A>,
  ms: number,
  __trace?: string
): Effect<R & HasClock, E, A> {
  return chain_(sleep(ms, __trace), () => effect)
}
