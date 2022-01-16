// ets_tracing: off

import type { XSynchronized } from "../definition"

/**
 * Returns a read only view of the `XRef.Synchronized`.
 *
 * @ets_optimize identity
 */
export function readOnly<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
): XSynchronized<RA, RB, EA, EB, never, B> {
  return self
}
