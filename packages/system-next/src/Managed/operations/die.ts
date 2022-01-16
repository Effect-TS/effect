// ets_tracing: off

import * as Cause from "../../Cause/definition"
import type { Managed } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that dies with the specified `Throwable`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 */
export function die(defect: unknown, __trace?: string): Managed<unknown, never, never> {
  return failCause(Cause.die(defect), __trace)
}
