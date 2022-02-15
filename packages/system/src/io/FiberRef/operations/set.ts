import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Sets the value associated with the current fiber.
 */
export function set_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  value: A,
  __etsTrace?: string
): IO<EA, void> {
  concreteUnified(self)
  return self.set(value)
}

/**
 * Sets the value associated with the current fiber.
 *
 * @ets_data_first set_
 */
export function set<A>(value: A, __etsTrace?: string) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): IO<EA, void> => set_(self, value)
}
