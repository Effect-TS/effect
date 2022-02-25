import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Reads the value from the `XRef`.
 */
export function get<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  __tsplusTrace?: string
): Effect<RB, EB, A> {
  return concrete(self).get
}
