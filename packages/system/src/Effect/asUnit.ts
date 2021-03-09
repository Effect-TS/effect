// tracing: off
import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @trace call
 */
export function asUnit<R, E, X>(_: Effect<R, E, X>) {
  const trace = accessCallTrace()
  return chain_(
    _,
    traceFrom(trace, () => unit)
  )
}
