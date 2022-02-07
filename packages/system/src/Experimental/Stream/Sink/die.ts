// ets_tracing: off

import * as CS from "../../../Cause/index.js"
import type * as C from "./core.js"
import * as FailCause from "./failCause.js"

/**
 * Creates a sink halting with the specified `Throwable`.
 */
export function die<E>(e: E): C.Sink<unknown, unknown, unknown, never, unknown, never> {
  return FailCause.failCause(CS.die(e))
}
