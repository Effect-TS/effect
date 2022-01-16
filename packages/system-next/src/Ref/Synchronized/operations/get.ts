// ets_tracing: off

import type { XSynchronized } from "../definition"
import type { Effect } from "./_internal/effect"

/**
 * Reads the value from the `XRef.Synchronized`.
 */
export function get<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
): Effect<RB, EB, B> {
  return self.get
}
