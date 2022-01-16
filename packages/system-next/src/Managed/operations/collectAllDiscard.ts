// ets_tracing: off

import { identity } from "../../Function"
import type { Managed } from "../definition"
import { forEachDiscard_ } from "./forEachDiscard"

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 */
export function collectAllDiscard<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEachDiscard_(as, identity, __trace)
}
