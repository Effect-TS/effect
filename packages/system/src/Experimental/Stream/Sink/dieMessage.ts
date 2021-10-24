// ets_tracing: off

import * as CS from "../../../Cause"
import type * as C from "./core"
import * as FailCause from "./failCause"

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(
  message: string
): C.Sink<unknown, unknown, unknown, never, unknown, never> {
  return FailCause.failCause(CS.die(new CS.RuntimeError(message)))
}
