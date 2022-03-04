import type { STM } from "../../STM"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Retrieves the value of the `XTRef`.
 *
 * @tsplus fluent ets/XTRef get
 */
export function get<EA, EB, A, B>(self: XTRef<EA, EB, A, B>): STM<unknown, EB, B> {
  concrete(self)
  return self._get
}
