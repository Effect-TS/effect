import { identity } from "../../../data/Function"
import type { Managed } from "../definition"
import { forEachParDiscard_ } from "./forEachParDiscard"

/**
 * Evaluate each effect in the structure in parallel, and discard the results.
 * For a sequential version, see `collectAllDiscard`.
 */
export function collectAllParDiscard<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEachParDiscard_(as, identity, __trace)
}
