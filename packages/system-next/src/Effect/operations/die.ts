import * as Cause from "../../Cause"
import * as Trace from "../../Trace"
import type { UIO } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that dies with the specified `unknown`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 */
export function die(defect: unknown, __trace?: string): UIO<never> {
  return failCause(Cause.die(defect, Trace.none), __trace)
}
