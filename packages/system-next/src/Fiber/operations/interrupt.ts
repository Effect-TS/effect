// ets_tracing: off

import type { Exit } from "../../Exit"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect"

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export function interrupt<E, A>(
  self: Fiber<E, A>,
  __trace?: string
): T.UIO<Exit<E, A>> {
  return T.chain_(T.fiberId, (fiberId) => self.interruptAs(fiberId), __trace)
}
