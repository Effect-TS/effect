import { chain_ } from "../../Effect/operations/chain"
import { fiberId } from "../../Effect/operations/fiberId"
import type { Exit } from "../../Exit"
import type { Fiber } from "../definition"
import type { UIO } from "./_internal/effect"

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export function interrupt<E, A>(self: Fiber<E, A>, __trace?: string): UIO<Exit<E, A>> {
  return chain_(fiberId, (fiberId) => self.interruptAs(fiberId), __trace)
}
