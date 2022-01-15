// ets_tracing: off

import type { IO } from "../Effect/primitives"
import type { XFiberRef } from "./fiberRef"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export function get<EA, EB, A, B>(fiberRef: XFiberRef<EA, EB, A, B>): IO<EB, B> {
  return fiberRef.get
}
