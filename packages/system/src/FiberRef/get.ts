// ets_tracing: off

import type { IO } from "../Effect/primitives.js"
import type { XFiberRef } from "./fiberRef.js"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export function get<EA, EB, A, B>(fiberRef: XFiberRef<EA, EB, A, B>): IO<EB, B> {
  return fiberRef.get
}
