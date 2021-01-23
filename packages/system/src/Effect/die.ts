// tracing: off
import { accessCallTrace, traceAs, traceFrom } from "@effect-ts/tracing-utils"

import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @trace call
 */
export function die(e: unknown) {
  const trace = accessCallTrace()
  return haltWith(traceFrom(trace, (trace) => C.traced(C.die(e), trace())))
}

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @trace 0
 */
export function dieWith(e: () => unknown) {
  return haltWith(traceAs(e, (trace) => C.traced(C.die(e), trace())))
}
