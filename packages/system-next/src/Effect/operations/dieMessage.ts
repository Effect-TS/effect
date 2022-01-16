// ets_tracing: off

import * as Cause from "../../Cause"
import type { UIO } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 */
export function dieMessage(message: string, __trace?: string): UIO<never> {
  return failCause(Cause.stackless(Cause.die(new Cause.RuntimeError(message))), __trace)
}
