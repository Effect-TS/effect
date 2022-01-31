// ets_tracing: off

import * as CS from "../../../Cause/index.js"
import type * as C from "./core.js"
import * as FailCause from "./failCause.js"

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(
  message: string
): C.Sink<unknown, unknown, unknown, never, unknown, never> {
  return FailCause.failCause(CS.die(new CS.RuntimeError(message)))
}
