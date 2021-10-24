// ets_tracing: off

import type * as CS from "../../../Cause"
import * as CH from "../Channel"
import * as C from "./core"

/**
 * Creates a sink halting with a specified cause.
 */
export function failCause<E>(
  e: CS.Cause<E>
): C.Sink<unknown, unknown, unknown, E, unknown, never> {
  return new C.Sink(CH.failCause(e))
}
