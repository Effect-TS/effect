import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"

/**
 * Reads the value from the `XRef`.
 */
export function get<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>
): Effect<RB, EB, A> {
  return concrete(self).get
}
