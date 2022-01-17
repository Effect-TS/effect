import type { Managed } from "../../Managed/definition"
import { fromEffect } from "../../Managed/operations/fromEffect"
import type { Effect } from "../definition"

/**
 * Converts this Effect to a Managed. This Effect and the provided release action
 * will be performed uninterruptibly.
 */
export function toManaged<A, R1, E1>(self: Effect<R1, E1, A>): Managed<R1, E1, A> {
  return fromEffect(self)
}
