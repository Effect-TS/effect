import type { Fiber } from "../definition"
import * as T from "./_internal/effect-api"
import { interruptAllAs } from "./interruptAllAs"

/**
 * Interrupts all fibers, awaiting their interruption.
 */
export function interruptAll(fibers: Iterable<Fiber<any, any>>): T.UIO<void> {
  return T.chain_(T.fiberId, (fiberId) => interruptAllAs(fiberId)(fibers))
}
