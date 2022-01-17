import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Sets the value associated with the current fiber.
 */
export function set_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  value: A,
  __trace?: string
): IO<EA, void> {
  concreteUnified(self)
  return self.set(value, __trace)
}

/**
 * Sets the value associated with the current fiber.
 *
 * @ets_data_first set_
 */
export function set<A>(value: A, __trace?: string) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): IO<EA, void> =>
    set_(self, value, __trace)
}
