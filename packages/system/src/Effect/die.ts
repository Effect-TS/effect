// ets_tracing: off

import * as C from "../Cause/cause.js"
import { haltWith } from "./core.js"

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export function die(e: unknown, __trace?: string) {
  return haltWith((trace) => C.traced(C.die(e), trace()), __trace)
}

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export function dieWith(e: () => unknown, __trace?: string) {
  return haltWith((trace) => C.traced(C.die(e()), trace()), __trace)
}
