// tracing: off

import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import type { HasClock } from "../Clock"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { sleep } from "./sleep"

/**
 * Delay the effect of n milliseconds
 *
 * @dataFirst delay_
 * @trace call
 */
export function delay(ms: number) {
  const trace = accessCallTrace()
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R & HasClock, E, A> =>
    traceCall(delay_, trace)(effect, ms)
}

/**
 * Delay the effect of ms milliseconds
 *
 * @trace call
 */
export function delay_<R, E, A>(
  effect: Effect<R, E, A>,
  ms: number
): Effect<R & HasClock, E, A> {
  const trace = accessCallTrace()
  return chain_(
    sleep(ms),
    traceFrom(trace, () => effect)
  )
}
