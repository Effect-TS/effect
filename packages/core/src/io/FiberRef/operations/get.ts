import type { IO } from "../../Effect"
import type { XFiberRef, XFiberRefInternal } from "../definition"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 *
 * @tsplus fluent ets/XFiberRef get
 * @tsplus fluent ets/XFiberRefRuntime get
 */
export function get<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  __tsplusTrace?: string
): IO<EB, B> {
  // Using a type cast here instead of `concreteUnified` to prevent a circular
  // dependency
  return (self as XFiberRefInternal<EA, EB, A, B>)._get
}
