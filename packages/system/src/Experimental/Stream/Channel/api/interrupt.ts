// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as F from "../../../../Fiber/index.js"
import * as C from "../core.js"

export function interrupt(
  fiberId: F.FiberID
): C.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return C.failCause(CS.interrupt(fiberId))
}
