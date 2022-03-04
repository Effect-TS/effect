import type { STM } from "../../STM"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Sets the value of the `XTRef`.
 *
 * @tsplus fluent ets/XTRef set
 */
export function set_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, B>,
  a: A
): STM<unknown, EA, void> {
  concrete(self)
  return self._set(a)
}

/**
 * Sets the value of the `XTRef`.
 *
 * @ets_data_first set_
 */
export function set<A>(a: A) {
  return <EA, EB, B>(self: XTRef<EA, EB, A, B>): STM<unknown, EA, void> => self.set(a)
}
