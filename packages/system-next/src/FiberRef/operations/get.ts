import type { IO } from "../../Effect"
import type { XFiberRef, XFiberRefInternal } from "../definition"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export function get<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  __trace?: string
): IO<EB, B> {
  return (self as XFiberRefInternal<EA, EB, A, B>).get
}
