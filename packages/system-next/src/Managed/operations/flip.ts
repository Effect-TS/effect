// ets_tracing: off

import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Flip the error and result
 */
export function flip<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, A, E> {
  return foldManaged_(self, succeedNow, failNow, __trace)
}
