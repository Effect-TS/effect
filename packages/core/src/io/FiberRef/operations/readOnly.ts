import type { XFiberRef } from "../definition"

/**
 * Returns a read only view of the `XFiberRef`.
 *
 *  @tsplus macro identity
 */
export function readOnly<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): XFiberRef<EA, EB, never, B> {
  return self
}
