// ets_tracing: off

import { identity } from "../../Function"
import type { Managed } from "../definition"
import { forEachPar_ } from "./forEachPar"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEachPar_(as, identity, __trace)
}
