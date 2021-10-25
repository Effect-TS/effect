// ets_tracing: off

import * as CS from "../../../../Cause"
import type * as F from "../../../../Fiber"
import * as C from "../core"

export function interrupt(
  fiberId: F.FiberID
): C.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return C.failCause(CS.interrupt(fiberId))
}
