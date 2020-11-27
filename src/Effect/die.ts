import { traceFrom } from "@effect-ts/tracing-utils"

import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @tracecall die
 */
export function die(e: unknown) {
  // tracing: off
  return haltWith(traceFrom("die", (trace) => C.traced(C.die(e), trace())))
  // tracing: on
}
