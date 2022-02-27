import type { XFiberRef } from "../definition"

/**
 * Returns a read only view of the `XFiberRef`.
 *
 * @tsplus macro identity
 * @tsplus fluent ets/XFiberRef readOnly
 * @tsplus fluent ets/XFiberRefRuntime readOnly
 */
export function readOnly<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): XFiberRef<EA, EB, never, B> {
  return self
}
