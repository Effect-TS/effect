// ets_tracing: off

import * as T from "./_internal/effect.js"
import type * as Fiber from "./core.js"

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export function interrupt<E, A>(fiber: Fiber.Fiber<E, A>) {
  return T.chain_(T.fiberId, (id) => fiber.interruptAs(id))
}
