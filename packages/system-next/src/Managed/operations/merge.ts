// ets_tracing: off

import type { Managed } from "../definition"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return foldManaged_(self, succeedNow, succeedNow, __trace)
}
