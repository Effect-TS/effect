// tracing: off
import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

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
