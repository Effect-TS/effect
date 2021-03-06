// tracing: off

import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 *
 * @trace call
 */
export function eventually<R, E, A>(fa: Effect<R, E, A>): Effect<R, never, A> {
  const trace = accessCallTrace()
  return orElse_(
    fa,
    traceFrom(trace, () => traceCall(eventually, trace)(fa))
  )
}
