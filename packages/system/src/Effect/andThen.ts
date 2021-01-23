// tracing: off
import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Like chain but ignores the input
 *
 * @dataFirst andThen_
 * @trace call
 */
export function andThen<R1, E1, A1>(fb: Effect<R1, E1, A1>) {
  const trace = accessCallTrace()
  return traceCall(<R, E, A>(fa: Effect<R, E, A>) => andThen_(fa, fb), trace)
}

/**
 * Like chain but ignores the input
 *
 * @trace call
 */
export function andThen_<R, E, A, R1, E1, A1>(
  fa: Effect<R, E, A>,
  fb: Effect<R1, E1, A1>
) {
  const trace = accessCallTrace()
  return chain_(
    fa,
    traceFrom(trace, () => fb)
  )
}
