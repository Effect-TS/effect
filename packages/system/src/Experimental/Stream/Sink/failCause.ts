// ets_tracing: off

import type * as CS from "../../../Cause/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a sink halting with a specified cause.
 */
export function failCause<E>(
  e: CS.Cause<E>
): C.Sink<unknown, unknown, unknown, E, unknown, never> {
  return new C.Sink(CH.failCause(e))
}
