import type { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 *
 * @tsplus fluent ets/XFiberRef initialValue
 * @tsplus fluent ets/XFiberRefRuntime initialValue
 */
export function initialValue<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): Either<EB, B> {
  concreteUnified(self)
  return self._initialValue
}
