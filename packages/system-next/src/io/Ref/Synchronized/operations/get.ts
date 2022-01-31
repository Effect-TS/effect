import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Reads the value from the `XRef.Synchronized`.
 */
export function get<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  __etsTrace?: string
): Effect<RB, EB, B> {
  return self.get
}
