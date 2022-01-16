// ets_tracing: off

import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export function get<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  __trace?: string
): IO<EB, B> {
  concreteUnified(self)
  return self.get
}
