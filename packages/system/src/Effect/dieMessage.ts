// ets_tracing: off

import { RuntimeError } from "../Cause/index.js"
import { dieWith } from "./die.js"
import type { UIO } from "./effect.js"

/**
 * Returns an effect that dies with a {@link RuntimeError} having the
 * specified text message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string, __trace?: string): UIO<never> {
  return dieWith(() => new RuntimeError(message), __trace)
}
