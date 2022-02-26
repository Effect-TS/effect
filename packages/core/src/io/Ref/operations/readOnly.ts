import type { XRef } from "../definition"

/**
 * Returns a read only view of the `XRef`.
 *
 * @tsplus fluent ets/XRef readOnly
 * @tsplus macro identity
 */
export function readOnly<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, B>
): XRef<RA, RB, EA, EB, never, B> {
  return self
}
