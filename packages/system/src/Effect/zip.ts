// tracing: off

import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @dataFirst zip_
 * @trace call
 */
export function zip<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  const trace = accessCallTrace()
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, readonly [A, A2]> =>
    traceCall(zip_, trace)(a, b)
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @trace call
 */
export function zip_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, readonly [A, A2]> {
  const trace = accessCallTrace()
  return chain_(
    a,
    traceFrom(trace, (ra) => map_(b, (rb) => [ra, rb]))
  )
}
