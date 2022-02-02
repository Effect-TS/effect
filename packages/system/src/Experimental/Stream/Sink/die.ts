// ets_tracing: off

import * as CS from "../../../Cause"
import type * as C from "./core"
import * as FailCause from "./failCause"

/**
 * Creates a sink halting with the specified `Throwable`.
 */
export function die<E>(e: E): C.Sink<unknown, unknown, unknown, never, unknown, never> {
  return FailCause.failCause(CS.die(e))
}
